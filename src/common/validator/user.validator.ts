import z from "zod";
import { FiatCurrencyEnum } from "../enum";

export const currencySchema = z.object({
  currency: z.enum(FiatCurrencyEnum),
});

export const createTagSchema = z
  .object({
    tag: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Tag must be at least 3 characters")
      .max(20, "Tag must be less than 20 characters")
      .regex(
        /^[a-z0-9_]+$/,
        "Tag can only contain letters, numbers, and underscores",
      )
      .refine((value) => !/\s/.test(value), "Tag cannot contain spaces"),
  })
  .strip();

export const updateUserSchema = z
  .object({
    avatar: z.url("Avatar must be a valid URL").trim().optional(),
  })
  .strip();

export const pinSchema = z.object({
  pin: z
    .string()
    .trim()
    .length(4, "PIN must be exactly 4 digits")
    .regex(/^\d{4}$/, "PIN must contain only numbers"),
});

export const rewardTransferSchema = pinSchema;
export const swapCoinsSchema = pinSchema;
