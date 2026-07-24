import { z } from "zod";
import { validationConstants } from "../constant";

const passcodeField = z
  .string()
  .trim()
  .length(6, "Passcode must be exactly 6 digits")
  .regex(/^\d{6}$/, "Passcode must contain only numbers");

export const payAirtimeSchema = z
  .object({
    network: z.enum(["mtn", "glo", "airtel", "9mobile"]),
    phone: z
      .string()
      .trim()
      .refine((phone) => /^(070|080|081|090|091)\d{8}$/.test(phone), {
        message:
          "Phone number should start with 070, 080, 081, 090, or 091 and be followed by 8 digits.",
      }),
    amount: z
      .number()
      .positive(validationConstants.NUMBER_GREATER_THAN_ZERO)
      .max(
        Number.MAX_SAFE_INTEGER - 100_000_000,
        "Amount exceeds maximum limit.",
      ),
    passcode: passcodeField,
  })
  .strip();

export const validateCablePlatformSchema = z.object({
  entity: z.string().trim(),
});

export const validateSmartcardNumberSchema = z.object({
  entity: z.string().trim(),
  smartcardNumber: z.string().trim(),
  save: z.boolean().optional().default(false),
});

export const buyCableSchema = z.object({
  smartcardNumber: z.string().trim(),
  planId: z.string().trim(),
  passcode: passcodeField,
});
