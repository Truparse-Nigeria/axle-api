import {
  AppError,
  createHash,
  generateOTP,
  incrCache,
  OtpPrefixEnum,
  requestOtpSchema,
  secondsUntilEndOfDay,
  sendResponse,
  setCache,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { createJob } from "@/queue";

// user for multiple otp
export const requestOtp = catchAsync(async (req, res) => {
  const { email, context } = await validateRequestPayload(
    req.body,
    requestOtpSchema,
  );

  // Limit OTP key to 10 per user per 24 hours
  const otpLimitKey = `${OtpPrefixEnum.OTP_ATTEMPT}:${email}`;

  const attempts = await incrCache(otpLimitKey, secondsUntilEndOfDay());

  if (attempts > 10) {
    throw new AppError("Whoa! OTP limit reached. Try again tomorrow!.");
  }

  const otp = generateOTP();

  await setCache(
    `${OtpPrefixEnum.OTP_STORE}:${email}`,
    { otp: await createHash(otp), context },
    5 * 60,
  );

  createJob({
    type: "SEND_EMAIL",
    priority: 1,
    to: email,
    subject: "Forgot Passcode",
    template: ` otp `,
  });

  sendResponse(res, 200, "Your OTP is on its way! Check your email");
});
