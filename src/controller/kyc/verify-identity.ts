import {
  AppError, assertKycIdentityConsistency, decryptData, deleteCache, encryptData,
  getCache, incrCache, KycEnum, kycVerifySchema, normalizeKycDate, secondsUntilEndOfDay,
  sendResponse, throwIfIdentifierHasBeenUsed, validateRequestPayload,
  type IDojahCachedDetails,
  type IUser,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";
import { createJob } from "@/queue";

export const verifyIdentity = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found");
  const { finalizer, firstName, lastName, phoneNumber, dateOfBirth } =
    await validateRequestPayload(req.body, kycVerifySchema);
  const finalizerData = await getCache<{ identifier: string; type: KycEnum.BVN | KycEnum.NIN; userId: string }>(`IDENTITY_FINALIZER_${finalizer}`);
  if (!finalizerData || finalizerData.userId !== String(user._id)) {
    throw new AppError("You took too long! Please restart KYC process", 400);
  }
  const cached = await getCache<IDojahCachedDetails>(`IDENTIFIER_${finalizerData.type}:${finalizerData.identifier}`);
  if (!cached) throw new AppError("Unable to complete KYC process", 400);
  const type = cached.type;
  if (type !== finalizerData.type) throw new AppError("Invalid KYC reference", 400);
  if (user.kyc?.[type]?.completed === true) throw new AppError("KYC already completed", 400);
  const attemptKey = `KYC_ATTEMPT_${type}:${user._id}`;
  if (Number(await getCache<number>(attemptKey)) >= 5) {
    throw new AppError("You've exhausted your 5 tries per day. Please try again tomorrow", 429);
  }
  await throwIfIdentifierHasBeenUsed(finalizerData.identifier, type, String(user._id));

  if (
    cached.firstName !== firstName.toLowerCase().trim() ||
    cached.lastName !== lastName.toLowerCase().trim() ||
    decryptData(cached.phoneNumber) !== phoneNumber ||
    cached.dateOfBirth !== normalizeKycDate(dateOfBirth)
  ) {
    await incrCache(attemptKey, secondsUntilEndOfDay());
    throw new AppError("KYC details do not match", 400);
  }

  const existing = await User.findById(user._id).select("+kyc.bvn.details +kyc.nin.details +kyc.passport.details");
  try {
    assertKycIdentityConsistency(existing?.kyc, type, cached);
  } catch (error) {
    await incrCache(attemptKey, secondsUntilEndOfDay());
    throw error;
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id, [`kyc.${type}.completed`]: { $ne: true } },
    { $set: {
      [`kyc.${type}.completed`]: true,
      [`kyc.${type}.identifier`]: finalizerData.identifier,
      [`kyc.${type}.details`]: {
        firstName: cached.firstName,
        lastName: cached.lastName,
        middleName: cached.middleName,
        dateOfBirth: encryptData(cached.dateOfBirth),
        phoneNumber: cached.phoneNumber,
        image: cached.image,
        ...(cached.idUrl && { idUrl: cached.idUrl }),
      },
    } },
    { new: true },
  );
  if (!updatedUser) throw new AppError("KYC already completed", 400);

  await deleteCache(attemptKey);
  await deleteCache(`IDENTIFIER_${finalizerData.type}:${finalizerData.identifier}`);
  await deleteCache(`IDENTITY_FINALIZER_${finalizer}`);
  
  if (type === KycEnum.BVN && !updatedUser.wallet.fiat.NGN.accounts.some((account) => account.bankName === "Safe Haven MFB")) {
    createJob({
      type: "PROCESS_STATIC_ACCOUNT",
      identifier: decryptData(finalizerData.identifier),
      user: updatedUser.toJSON() as unknown as IUser & { _id: string },
      dob: cached.dateOfBirth,
    });
  }
  return sendResponse(res, 200, `${type.toUpperCase()} KYC completed`);
});
