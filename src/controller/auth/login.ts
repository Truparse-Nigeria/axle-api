import {
  AppError,
  compareHash,
  ENVIRONMENT,
  loginSchema,
  sendResponse,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { UserModel } from "@/model";
import jwt, { type SignOptions } from "jsonwebtoken";

const signTokens = (userId: string) => {
  const { USER } = ENVIRONMENT.JWT;

  const accessToken = jwt.sign(
    { id: userId },
    USER.ACCESS_TOKEN_SECRET as string,
    { expiresIn: USER.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"] }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    USER.REFRESH_TOKEN_SECRET as string,
    { expiresIn: USER.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"] }
  );

  return { accessToken, refreshToken };
};

export const login = catchAsync(async (req, res) => {
  const { email, passcode: rawPasscode } = await validateRequestPayload(
    req.body,
    loginSchema
  );

  const user = await UserModel.findOne({ email }).select("+passcode");

  // Same error for unknown email and wrong passcode so the response
  // doesn't reveal which accounts exist
  if (!user || !(await compareHash(rawPasscode, user.passcode))) {
    throw new AppError("Invalid email or passcode", 401);
  }

  const { accessToken, refreshToken } = signTokens(String(user._id));

  res.locals.accessToken = accessToken;
  res.locals.refreshToken = refreshToken;

  const { passcode, ...loggedInUser } = user.toObject();

  sendResponse(res, 200, "Welcome back!", { user: loggedInUser });
});
