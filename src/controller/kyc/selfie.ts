import { AppError, kycSelfieSchema, SelfieStatusEnum, sendResponse, validateRequestPayload } from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";

export const uploadSelfie = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found");
  const { selfie } = await validateRequestPayload(req.body, kycSelfieSchema);
  if (user.kyc?.selfie?.completed && user.kyc.selfie.details?.file) {
    throw new AppError("Selfie already uploaded", 400);
  }
  const updated = await User.findByIdAndUpdate(user._id, {
    $set: {
      "kyc.selfie.completed": false,
      "kyc.selfie.status": SelfieStatusEnum.PENDING,
      "kyc.selfie.details.file": selfie,
    },
  }, { new: true });
  if (!updated) throw new AppError("Unable to update your profile", 400);
  return sendResponse(res, 200, "Selfie awaiting review", updated);
});
