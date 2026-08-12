import { z } from "zod";
import {
  CardBrandEnum,
  CardVariantEnum,
  FiatCurrencyEnum,
} from "../enum";
import { validationConstants } from "../constant";

export const createCardSchema = z.object({
  pin: z
    .string()
    .trim()
    .length(4, "PIN must be exactly 4 digits")
    .regex(/^\d{4}$/, "PIN must contain only numbers"),
  amount: z.number().positive(validationConstants.NUMBER_GREATER_THAN_ZERO),
  currency: z.enum(FiatCurrencyEnum),
  cardBrand: z.enum(CardBrandEnum),
  name: z.string().max(12, "Name must not be more than 12 characters"),
  variant: z.enum(CardVariantEnum).default(CardVariantEnum.PRO),
});

const pinField = z
  .string()
  .trim()
  .length(4, "PIN must be exactly 4 digits")
  .regex(/^\d{4}$/, "PIN must contain only numbers");

export const fundCardSchema = z.object({
  cardId: z.string(),
  amount: z.number().positive(validationConstants.NUMBER_GREATER_THAN_ZERO),
  pin: pinField,
});

export const withdrawCardSchema = z.object({
  cardId: z.string(),
  amount: z.number().positive(validationConstants.NUMBER_GREATER_THAN_ZERO),
  pin: pinField,
});
