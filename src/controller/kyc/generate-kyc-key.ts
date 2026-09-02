import {
  AppError,
  generateRandomString,
  sendResponse,
  setCache,
} from "@/common";
import { catchAsync } from "@/middleware";

export const generateKycKey = catchAsync(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  const generatedKey = generateRandomString(32, "KYC_");

  await setCache(`kyc_key_${user._id}`, generatedKey, 60 * 60 * 24); // Cache for 24 hours

  return sendResponse(res, 200, "KYC key generated successfully", {
    reference: generatedKey,
  });
});
