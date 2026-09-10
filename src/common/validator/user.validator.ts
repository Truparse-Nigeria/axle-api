import z from "zod";
import { FiatCurrencyEnum } from "../enum";

export const currencySchema = z.object({
  currency: z.enum(FiatCurrencyEnum),
});