import {
  AppError, decryptData, encryptData, generateRandomString, getCache, identityLookupSchema,
  incrCache, KycEnum, maskPhone, normalizeKycDate, secondsUntilEndOfDay, sendResponse,
  setCache, throwIfIdentifierHasBeenUsed, uploadFile, validateRequestPayload,
  type IDojahCachedDetails,
} from "@/common";
import { catchAsync } from "@/middleware";
import { dojahBVNLookup, dojahNINLookup } from "@/provider";

export const lookupIdentity = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found");
  const { type, identifier } = await validateRequestPayload(req.query, identityLookupSchema);
  if (user.kyc?.[type]?.completed === true) throw new AppError("KYC already completed", 400);

  const attemptKey = `KYC_ATTEMPT_${type}:${user._id}`;
  if (Number(await getCache<number>(attemptKey)) >= 5) {
    throw new AppError("You've exhausted your 5 tries per day. Please try again tomorrow", 429);
  }

  const encryptedIdentifier = encryptData(identifier);
  await throwIfIdentifierHasBeenUsed(encryptedIdentifier, type, String(user._id));
  const cacheKey = `IDENTIFIER_${type}:${encryptedIdentifier}`;
  let cached = await getCache<IDojahCachedDetails>(cacheKey);

  if (!cached) {
    const response = type === KycEnum.BVN ? await dojahBVNLookup(identifier) : await dojahNINLookup(identifier);
    if (response.error || !response.data) {
      await incrCache(attemptKey, secondsUntilEndOfDay());
      throw new AppError("Unable to retrieve identity", 404);
    }
    const data = response.data;
    if (!data.firstName || !data.lastName || !data.dateOfBirth || !data.phoneNumber) {
      throw new AppError("Incomplete identity data returned from provider", 400);
    }
    const image = data.image
      ? await uploadFile(data.image, `${type}-${user._id}`, "png")
      : undefined;
    const idUrl = "idUrl" in data && data.idUrl
      ? encryptData(await uploadFile(data.idUrl, `${type}-id-${user._id}`, "pdf"))
      : undefined;
    cached = {
      type,
      identifier: encryptedIdentifier,
      firstName: data.firstName.toLowerCase().trim(),
      lastName: data.lastName.toLowerCase().trim(),
      dateOfBirth: normalizeKycDate(data.dateOfBirth),
      phoneNumber: encryptData(data.phoneNumber.trim().replace(/^\+?234/, "0")),
      middleName: data.middleName?.toLowerCase().trim(),
      image,
      idUrl,
    };
  }

  await setCache(cacheKey, cached, 3 * 24 * 60 * 60);
  const finalizer = generateRandomString(12);
  await setCache(`IDENTITY_FINALIZER_${finalizer}`, { identifier: encryptedIdentifier, type, userId: String(user._id) }, 5 * 60);
  return sendResponse(res, 200, "Success", {
    finalizer,
    phone: maskPhone(decryptData(cached.phoneNumber)),
  });
});
