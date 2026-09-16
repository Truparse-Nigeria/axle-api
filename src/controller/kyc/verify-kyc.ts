import {
  AppError,
  decryptData,
  deleteFields,
  encryptData,
  getCache,
  KycEnum,
  SelfieStatusEnum,
  SENSITIVE_USER_FIELDS,
  type IKycDetailSchema,
  type IUser,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User, type IUserDocument } from "@/model";
import { dojahVerification } from "@/provider/dojah";
import { createJob } from "@/queue";

// Break a name into normalized, comparable word tokens.
const nameTokens = (value?: string): string[] =>
  (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

// All tokens (first + middle + last) present in a stored KYC detail record.
const storedNameTokens = (details?: IKycDetailSchema): Set<string> =>
  new Set([
    ...nameTokens(details?.firstName),
    ...nameTokens(details?.middleName),
    ...nameTokens(details?.lastName),
  ]);

// Decrypt a stored (encrypted) date of birth for comparison; never throws.
const safeDecryptDob = (value?: string): string => {
  if (!value) return "";
  try {
    return decryptData(value).trim();
  } catch {
    return "";
  }
};

// True when every token of `name` is present in `stored`.
const containedIn = (
  name: string | undefined,
  stored: Set<string>,
): boolean => {
  const tokens = nameTokens(name);
  return tokens.length > 0 && tokens.every((token) => stored.has(token));
};

// KYC types that carry identity details (address KYC holds a different shape).
const IDENTITY_KYC_TYPES = [
  KycEnum.BVN,
  KycEnum.NIN,
  KycEnum.PASSPORT,
  KycEnum.DRIVERS_LICENSE,
] as const;

const assertKycIdentityConsistency = (
  existingKyc: IUserDocument["kyc"] | undefined,
  newType: KycEnum,
  newDetails: IKycDetailSchema,
) => {
  if (!existingKyc) return;

  const newDob = safeDecryptDob(newDetails.dateOfBirth);

  for (const type of IDENTITY_KYC_TYPES) {
    if (type === newType) continue;

    const existing = existingKyc[type];
    if (!existing?.completed || !existing.details) continue;

    if (newDob && safeDecryptDob(existing.details.dateOfBirth) !== newDob) {
      throw new AppError(
        "KYC details do not match your previously verified identity (date of birth mismatch).",
        400,
      );
    }

    const stored = storedNameTokens(existing.details);
    const lastNameMatches = containedIn(newDetails.lastName, stored);
    const firstOrMiddleMatches =
      containedIn(newDetails.firstName, stored) ||
      containedIn(newDetails.middleName, stored);

    if (!lastNameMatches || !firstOrMiddleMatches) {
      throw new AppError(
        "KYC details do not match your previously verified identity (name mismatch).",
        400,
      );
    }
  }
};

export const verifyKyc = catchAsync(async (req, res) => {
  const { reference } = req.query as { reference: string };

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  const cachedRef = await getCache(`kyc_key_${user._id}`);

  if (!cachedRef || cachedRef !== reference) {
    throw new AppError("Invalid KYC reference", 400);
  }

  const response = await dojahVerification(reference);

  if (!response.data || response.error) {
    throw new AppError("KYC Verification failed. Try again");
  }

  const { identifier, type, details } = response.data.userDetails;

  console.log(response.data.userDetails)

  const kycFieldMap: Record<KycEnum, string> = {
    [KycEnum.BVN]: "kyc.bvn",
    [KycEnum.DRIVERS_LICENSE]: "kyc.driversLicense",
    [KycEnum.PASSPORT]: "kyc.passport",
    [KycEnum.NIN]: "kyc.nin",
    [KycEnum.ADDRESS]: "kyc.address",
  };

  const kycType = type as KycEnum;
  const fieldToUpdate = kycFieldMap[kycType];

  console.log(kycType, fieldToUpdate)

  if (!fieldToUpdate) {
    throw new AppError("Unsupported KYC verification type", 400);
  }

  // KYC identifiers are deterministically encrypted by the provider adapter,
  // so equal identifiers have equal stored values and can be compared safely.
  // Exclude the current user so this check also works for legacy/incomplete KYC
  // records belonging to the same account.
  const identifierAlreadyUsed = await User.exists({
    _id: { $ne: user._id },
    [`${fieldToUpdate}.identifier`]: identifier,
  });

  if (identifierAlreadyUsed) {
    throw new AppError(
      `This ${kycType} has already been used by another account`,
      409,
    );
  }

  // Load previously approved KYC details (select:false on the schema) so we can
  // ensure the new document belongs to the same person.
  const existingKyc = await User.findById(user._id).select(
    "+kyc.bvn.details +kyc.nin.details +kyc.passport.details +kyc.driversLicense.details",
  );

  if (type !== KycEnum.ADDRESS)
    assertKycIdentityConsistency(existingKyc?.kyc, type as KycEnum, details);

  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id, [`${fieldToUpdate}.completed`]: { $ne: true } },
    {
      $set: {
        [fieldToUpdate]: { completed: true, identifier, details },
        ...((response.data.selfie ||
          response.data.userDetails?.details?.selfie) && {
          "kyc.selfie": {
            completed: true,
            status: SelfieStatusEnum.APPROVED,
            details: {
              file: encryptData(
                response.data.selfie ||
                  response.data.userDetails?.details?.selfie ||
                  "",
              ),
            },
          },
        }),
      },
    },
    { new: true },
  );

  if (!updatedUser) {
    throw new AppError(
      "KYC verification failed or is already completed. Please try again or contact support.",
    );
  }

  // Provision a permanent NGN bank account once BVN is verified
  if (updatedUser?.kyc?.bvn?.completed && type === KycEnum.BVN) {
    createJob({
      type: "PROCESS_STATIC_ACCOUNT",
      identifier: decryptData(identifier),
      user: updatedUser.toJSON() as unknown as IUser & { _id: string },
      dob: decryptData(details.dateOfBirth),
    });
  }

  return res.status(200).json({
    success: true,
    message: "KYC Verification successful",
    data: updatedUser,
  });
});
