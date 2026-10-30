import {
  AppError,
  ENVIRONMENT,
  sendResponse,
  updateUserSchema,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";

// Customer only endpoint
export const updateUser = catchAsync(async (req, res) => {
  const { avatar } = await validateRequestPayload(req.body, updateUserSchema);

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  const update: Record<string, string> = {};

  if (avatar) {
    // Only accept files uploaded to our own bucket via the generate-url flow
    const { BUCKET_NAME, SPACE_LINK } = ENVIRONMENT.DIGITAL_OCEAN;

    if (!avatar.startsWith(`https://${BUCKET_NAME}.${SPACE_LINK}/`)) {
      throw new AppError("Invalid avatar URL", 400);
    }

    update.avatar = avatar;
  }

  if (!Object.keys(update).length) {
    throw new AppError("Nothing to update", 400);
  }

  const updatedUser = await User.findByIdAndUpdate(user._id, update, {
    new: true,
  });

  if (!updatedUser) {
    throw new AppError("Oops! We couldn't update your profile. Try again.");
  }

  return sendResponse(res, 200, "Profile updated successfully.", updatedUser);
});
