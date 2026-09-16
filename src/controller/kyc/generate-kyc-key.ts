import {
  AppError,
  ENVIRONMENT,
  generateRandomString,
  KycEnum,
  KycStatusEnum,
  sendResponse,
  setCache,
} from "@/common";
import { catchAsync } from "@/middleware";

const widget = (type: KycEnum) => {
  switch (type) {
    case KycEnum.BVN:
      return ENVIRONMENT.DOJAH.BVN;
    case KycEnum.NIN:
      return ENVIRONMENT.DOJAH.NIN;
    case KycEnum.PASSPORT:
      return ENVIRONMENT.DOJAH.PASSPORT;
    case KycEnum.ADDRESS:
      return ENVIRONMENT.DOJAH.ADDRESS;
    case KycEnum.DRIVERS_LICENSE:
      return "";
    default:
      throw new AppError("Invalid KYC type");
  }
};

export const generateKycKey = catchAsync(async (req, res) => {
  const user = req.user;
  const { type } = req.query;

  if (!Object.values(KycEnum).includes(type as KycEnum)) {
    throw new AppError("Invalid KYC type");
  }

  if (!user) {
    throw new AppError("User not found");
  }

  if (user?.kyc?.[type as KycEnum]?.completed === KycStatusEnum.SUCCESS) {
    throw new AppError("KYC already completed");
  }

  const generatedKey = generateRandomString(32, String(user._id));

  const reference = generatedKey;

  await setCache(`kyc_key_${user._id}`, reference, 60 * 60 * 24); // Cache for 24 hours

  return sendResponse(res, 200, "KYC key generated successfully", {
    reference,
    widget: widget(type as KycEnum),
    email: "info@useaxle.co",
  });
});
