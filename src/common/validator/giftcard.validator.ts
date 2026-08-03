import { z } from "zod";
import { validationConstants } from "../constant";

const passcodeField = z
  .string()
  .trim()
  .length(6, "Passcode must be exactly 6 digits")
  .regex(/^\d{6}$/, "Passcode must contain only numbers");

export const giftcardProductsRetrieveSchema = z.object({
  size: z.string().optional(),
  page: z.string().optional(),
  countryCode: z.string().optional(),
  productName: z.string().optional(),
  productCategoryId: z.string().optional(),
});

export const giftcardOrderSchema = z.object({
  productId: z.string(),
  quantity: z
    .number()
    .positive(validationConstants.NUMBER_GREATER_THAN_ZERO)
    .min(1),
  unitPrice: z.number().positive(validationConstants.NUMBER_GREATER_THAN_ZERO),
  passcode: passcodeField,
});

export const redeemGiftcardSchema = z.object({
  transactionId: z.string(),
});
