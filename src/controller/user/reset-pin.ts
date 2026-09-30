import {
  AppError,
  createHash,
  deleteCache,
  getCache,
  OtpContextEnum,
  resetPinSchema,
  sendResponse,
  validateRequestPayload,
  type IOtpFinalizer,
  type TUser,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";

// Customer only endpoint
export const resetPin = catchAsync(async (req, res) => {
  // Validate data
  const { finalizer, context, pin } = await validateRequestPayload(
    req.body,
    resetPinSchema,
  );

  const user = req.user as TUser;

  if (!user) {
    throw new AppError("User not found");
  }

  if (!user.pin) {
    throw new AppError("You do not have a PIN. Create one first!", 400);
  }

  // User finalizer to check if the user is eligible to make this change
  const checkFinalizer = await getCache<IOtpFinalizer>(finalizer);
  deleteCache(finalizer);

  // Finalizer must be for a PIN reset and belong to the logged-in user
  if (
    !checkFinalizer ||
    context !== OtpContextEnum.RESET ||
    checkFinalizer.context !== context ||
    checkFinalizer.email !== user.email
  ) {
    throw new AppError("Too slow! PIN change expired. Try again!", 400);
  }

  const hashPin = await createHash(pin);

  await User.findByIdAndUpdate(user._id, {
    pin: hashPin,
  });

  sendResponse(res, 200, "Done! Your PIN is now fresh and secure");
});
