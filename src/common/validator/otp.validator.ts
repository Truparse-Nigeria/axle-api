import { z } from "zod";
import { OtpContextEnum } from "../enum";

export const requestOtpSchema = z.object({
  email: z.email(),
  context: z.enum(OtpContextEnum),
});

export const verifyOtpSchema = z.object({
  email: z.email(),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
  context: z.enum(OtpContextEnum),
});
