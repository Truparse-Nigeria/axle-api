import { AppError, kycSelfieSchema, SelfieStatusEnum, sendResponse, validateRequestPayload } from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";
import { createJob } from "@/queue";

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

  // Reward the referrer once, on the first submission. Re-uploads after a
  // rejection must not award again.
  const status = user.kyc?.selfie?.status;
  if (!status || status === SelfieStatusEnum.NOT_SUBMITTED) {
    createJob({
      type: "PROCESS_KYC_COMPLETE",
      userId: String(user._id),
    });
  }

  return sendResponse(res, 200, "Selfie awaiting review", updated);
});
