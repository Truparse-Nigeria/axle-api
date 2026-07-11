import { z } from "zod";
import { GenderEnum, OtpContextEnum } from "../enum";

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
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/\d/, "Password must contain a number"),
  referredBy: z.string().trim().optional(),
  messageToken: z.string().trim().optional(),
});

export const resetPasswordSchema = z.object({
  finalizer: z.string().trim().max(12),
  context: z.enum(OtpContextEnum),
  password: z
    .string()
    .trim()
    .min(6, "Password must be at least 6 characters")
    .max(50, "Password must be less than 50 characters"),
});
