import { z } from "zod";
import { validationConstants } from "../constant";
import { FiatCurrencyEnum } from "../enum";

const recipientTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Tag must be at least 3 characters")
  .max(20, "Tag must be less than 20 characters")
  .regex(
    /^[a-z0-9_]+$/,
    "Tag can only contain letters, numbers, and underscores",
  );

export const sendMoneyToWalletSchema = z
  .object({
    amount: z
      .number()
      .positive(validationConstants.NUMBER_GREATER_THAN_ZERO)
      .max(
        Number.MAX_SAFE_INTEGER - 100_000_000,
        "Amount exceeds maximum limit.",
      ),
    pin: z
      .string()
      .trim()
      .length(4, "PIN must be exactly 4 digits")
      .regex(/^\d{4}$/, "PIN must contain only numbers"),
    recipientTag: recipientTagSchema,
    currency: z.enum(FiatCurrencyEnum),
    category: z.string().optional(),
  })
  .strip();

export const checkRecipientSchema = z.object({
  recipientTag: recipientTagSchema,
});

export const enquiryNameSchema = z.object({
  accountNumber: z
    .string()
    .trim()
    .length(10, "Account number must be exactly 10 digits")
    .regex(/^\d{10}$/, "Account number must contain only numbers"),
  bankCode: z.string().trim().min(1, "Bank code is required"),
  save: z.boolean().default(true),
});

export const beneficiaryIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid beneficiary id"),
});

export const sendMoneyToBankSchema = z
  .object({
    amount: z
      .number()
      .positive(validationConstants.NUMBER_GREATER_THAN_ZERO)
      .max(
        Number.MAX_SAFE_INTEGER - 100_000_000,
        "Amount exceeds maximum limit.",
      ),
    pin: z
      .string()
      .trim()
      .length(4, "PIN must be exactly 4 digits")
      .regex(/^\d{4}$/, "PIN must contain only numbers"),
    beneficiaryId: z.string().trim().min(1, "Beneficiary is required"),
    narration: z.string().trim().max(100).default(""),
  })
  .strip();
