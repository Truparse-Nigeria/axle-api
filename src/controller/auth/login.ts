import {
  AccessTypeEnum,
  AppError,
  compareHash,
  getModel,
  loginSchema,
  sendResponse,
  tokenPair,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";

export const login = (accessType: AccessTypeEnum) =>
  catchAsync(async (req, res) => {
    const { email, passcode: rawPasscode } = await validateRequestPayload(
      req.body,
      loginSchema
    );

    const user = await getModel(accessType)
      .findOne({ email })
      .select("+passcode");

    // Same error for unknown email and wrong passcode so the response
    // doesn't reveal which accounts exist
    if (!user || !(await compareHash(rawPasscode, user.passcode))) {
      throw new AppError("Invalid email or passcode", 401);
    }

    const jti = await tokenPair(req, res, { id: String(user._id) }, accessType);

    await getModel(accessType).findByIdAndUpdate(user._id, { jti });

    const { passcode, ...loggedInUser } = user.toObject();

    sendResponse(res, 200, "Welcome back!", { user: loggedInUser });
  });
