import { z } from "zod";
import { validationConstants } from "../constant";

const pinField = z
  .string()
  .trim()
  .length(4, "PIN must be exactly 4 digits")
  .regex(/^\d{4}$/, "PIN must contain only numbers");

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
  pin: pinField,
});

export const redeemGiftcardSchema = z.object({
  transactionId: z.string(),
});
