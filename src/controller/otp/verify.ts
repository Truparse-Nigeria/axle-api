import {
  AppError,
  compareHash,
  decrCache,
  deleteCache,
  generateRandomString,
  getCache,
  OtpPrefixEnum,
  sendResponse,
  setCache,
  validateRequestPayload,
  verifyOtpSchema,
  type IStoredOtp,
} from "@/common";
import { catchAsync } from "@/middleware";

// user for multiple otp
export const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp, context } = await validateRequestPayload(
    req.body,
    verifyOtpSchema
  );

  // Fetch the OTP that was stored for some minutes
  const otpCache = await getCache<IStoredOtp>(
    `${OtpPrefixEnum.OTP_STORE}:${email}`
  );

  // Validate the data in cache to be sure it is a valid OTP
  if (!otpCache) {
    throw new AppError("Oops! That OTP ain't it. Try again!", 400);
  }

  const passedHash = await compareHash(otp, otpCache.otp)

  if (!passedHash) {
    throw new AppError("Nope! Wrong OTP. Give it another shot!", 400);
  }

  if (otpCache.context !== context) {
    throw new AppError("Oops! That OTP ain't it. Try again!", 400);
  }

  await deleteCache(`${OtpPrefixEnum.OTP_STORE}:${email}`);

  // Clear the user increment for OTP attempts
  await decrCache(`${OtpPrefixEnum.OTP_ATTEMPT}:${email}`);

  // Finalizer for OTP actions:
  // - Allows a user to create or modify data within a defined period.
  // - Changes must be finalized within this timeframe.
  // - On request to finalize, user must pass finalizer, context & created or modified data
  const finalizer = generateRandomString(12);
  await setCache(finalizer, { email, context }, 3 * 60);

  sendResponse(res, 200, " OTP verified. You're in!", {
    finalizer,
  });
});
