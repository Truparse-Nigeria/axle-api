import { z } from "zod";
import { GenderEnum, OtpContextEnum } from "../enum";

export const passcodeSchema = z
  .string()
  .trim()
  .min(6, "Passcode must be at least 6 digits")
  .max(12, "Passcode must be at most 12 digits")
  .regex(/^\d+$/, "Passcode must contain only numbers");

export const createPinSchema = z
  .object({
    pin: z
      .string()
      .length(4, "PIN must be exactly 4 digits")
      .regex(/^\d{4}$/, "PIN must contain only numbers"),
  })
  .strip();

export const signupSchema = z.object({
  firstName: z.string().trim().min(2, "First name is too short"),
  lastName: z.string().trim().min(2, "Last name is too short"),
  middleName: z.string().trim().min(2, "Middle name is too short"),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number is too short")
    .regex(/^\d+$/, "Phone must contain only numbers"),
  dialCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Dial code must look like +234"),
  email: z.email(),
  gender: z.enum(GenderEnum),
  passcode: passcodeSchema,
  referredBy: z.string().trim().optional(),
  messageToken: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  passcode: z.string().trim().min(1, "Passcode is required"),
});

export const resetPasscodeSchema = z.object({
  finalizer: z.string().trim().max(12),
  context: z.enum(OtpContextEnum),
  passcode: passcodeSchema,
});
