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