import {
  AppError,
  changePinSchema,
  createHash,
  pinCheck,
  sendResponse,
  validateRequestPayload,
  type TUser,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";

// Customer only endpoint
export const changePin = catchAsync(async (req, res) => {
  const { pin, oldPin } = await validateRequestPayload(
    req.body,
    changePinSchema,
  );

  const user = req.user as TUser;

  if (!user) {
    throw new AppError("User not found");
  }

  await pinCheck(oldPin, user.pin, String(user._id));

  if (oldPin === pin) {
    throw new AppError("No repeats! Choose a different PIN.");
  }

  const hashPin = await createHash(pin);

  await User.findByIdAndUpdate(user._id, {
    pin: hashPin,
  });

  sendResponse(res, 200, "You're good to go! PIN updated.");
});
