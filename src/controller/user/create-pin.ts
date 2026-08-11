import {
  AppError,
  createHash,
  createPinSchema,
  sendResponse,
  validateRequestPayload,
  type TUser,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";

// Customer only endpoint
export const createPin = catchAsync(async (req, res) => {
  const { pin } = await validateRequestPayload(req.body, createPinSchema);

  const user = req.user as TUser;

  if (!user) {
    throw new AppError("User not found");
  }

  if (user.pin) {
    throw new AppError("Nice try! You already have a PIN.", 400);
  }

  const hashPin = await createHash(pin);

  await User.findByIdAndUpdate(user._id, {
    pin: hashPin,
  });

  sendResponse(res, 200, "You're good to go! PIN created.");
});
