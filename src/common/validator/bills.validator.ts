import { z } from "zod";
import { validationConstants } from "../constant";

const pinField = z
  .string()
  .trim()
  .length(4, "PIN must be exactly 4 digits")
  .regex(/^\d{4}$/, "PIN must contain only numbers");

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
    pin: pinField,
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
  pin: pinField,
});

const meterNumberField = z
  .string()
  .trim()
  .refine((meterNumber) => /^\d{7,}$/.test(meterNumber), {
    message: "Meter number must be at least 7 digits",
  });

export const validateMeterNumberSchema = z.object({
  meterNumber: meterNumberField,
  disco: z.string().trim(),
  type: z.enum(["prepaid", "postpaid"]),
  save: z.boolean().optional().default(false),
});

export const payElectricitySchema = z
  .object({
    meterNumber: meterNumberField,
    disco: z.string().trim(),
    type: z.enum(["prepaid", "postpaid"]),
    amount: z
      .number()
      .positive(validationConstants.NUMBER_GREATER_THAN_ZERO)
      .max(
        Number.MAX_SAFE_INTEGER - 100_000_000,
        "Amount exceeds maximum limit.",
      ),
    pin: pinField,
  })
  .strip();
