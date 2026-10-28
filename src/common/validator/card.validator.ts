import { z } from "zod";
import {
  CardBrandEnum,
  CardVariantEnum,
  FiatCurrencyEnum,
  NgnCardVariantEnum,
} from "../enum";
import { validationConstants } from "../constant";

const createCardPin = z
  .string()
  .trim()
  .length(4, "PIN must be exactly 4 digits")
  .regex(/^\d{4}$/, "PIN must contain only numbers");

const createCardName = z
  .string()
  .max(12, "Name must not be more than 12 characters");

// Naira cards: Verve/AfriGo, physical or virtual, no funding amount
const createNgnCardSchema = z.object({
  pin: createCardPin,
  currency: z.literal(FiatCurrencyEnum.NGN),
  cardBrand: z.enum([CardBrandEnum.VERVE, CardBrandEnum.AFRIGO]),
  name: createCardName,
  variant: z.enum(NgnCardVariantEnum).default(NgnCardVariantEnum.VIRTUAL),
});

// Foreign-currency cards: MasterCard/Visa, funded with `amount`
const createForeignCardSchema = z.object({
  pin: createCardPin,
  amount: z.number().positive(validationConstants.NUMBER_GREATER_THAN_ZERO),
  currency: z.enum([FiatCurrencyEnum.USD]),
  cardBrand: z.enum([CardBrandEnum.MASTERCARD, CardBrandEnum.VISA]),
  name: createCardName,
  variant: z.enum(CardVariantEnum).default(CardVariantEnum.ORIGIN),
});

export const createCardSchema = z.discriminatedUnion("currency", [
  createNgnCardSchema,
  createForeignCardSchema,
]);

const pinField = z
  .string()
  .trim()
  .length(4, "PIN must be exactly 4 digits")
  .regex(/^\d{4}$/, "PIN must contain only numbers");

export const updateCardNameSchema = z.object({
  customName: createCardName.trim().min(1, "Name is required"),
});

export const updateCardNameIdSchema = z.object({
  cardId: z.string(),
});

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

export const createCardPinSchema = z.object({
  cardId: z.string(),
  // Only omitted/null while the card still has its default PIN
  oldPin: pinField.nullish(),
  newPin: pinField,
});

export const revealCardSchema = z.object({
  cardId: z.string(),
  pin: pinField,
});

export const freezeCardSchema = z.object({
  cardId: z.string(),
  pin: pinField,
});

export const terminateCardSchema = z.object({
  cardId: z.string(),
  pin: pinField,
});
