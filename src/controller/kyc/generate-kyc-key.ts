import {
  AppError,
  generateRandomString,
  KycEnum,
  sendResponse,
  setCache,
} from "@/common";
import { catchAsync } from "@/middleware";

export const generateKycKey = catchAsync(async (req, res) => {
  const user = req.user;
  const { type } = req.query;

  if (!Object.values(KycEnum).includes(type as KycEnum)) {
    throw new AppError("Invalid KYC type");
  }

  if (!user) {
    throw new AppError("User not found");
  }

  if (user.kyc[type as KycEnum].completed) {
    throw new AppError("KYC already completed");  
  }

  const generatedKey = generateRandomString(32, "KYC_");

  await setCache(`kyc_key_${user._id}`, generatedKey, 60 * 60 * 24); // Cache for 24 hours

  return sendResponse(res, 200, "KYC key generated successfully", {
    reference: generatedKey,
  });
});
