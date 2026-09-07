import { z } from "zod";
import { FiatCurrencyEnum, GloesimPackageTypeEnum } from "../enum";

export const esimPackagesRetrieveSchema = z.object({
  countryId: z.coerce
    .number()
    .int("countryId must be an integer")
    .positive("countryId must be greater than zero"),
  packageType: z.enum(GloesimPackageTypeEnum),
  page: z.coerce.number().int().positive().optional().default(1),
});

const esimPurchaseBase = {
  packageId: z.string().min(1, "packageId is required"),
  countryId: z.coerce
    .number()
    .int("countryId must be an integer")
    .positive("countryId must be greater than zero"),
  pin: z.string().min(1, "pin is required"),
  currency: z.enum(FiatCurrencyEnum).optional().default(FiatCurrencyEnum.NGN),
};

export const esimPurchaseSchema = z.discriminatedUnion("packageType", [
  z.object({
    packageType: z.literal(GloesimPackageTypeEnum.DATA_ONLY),
    ...esimPurchaseBase,
    iccid: z.string().min(1).optional(),
  }),
  z.object({
    packageType: z.literal(GloesimPackageTypeEnum.DATA_VOICE_SMS),
    ...esimPurchaseBase,
    imei: z.string().optional().default(""),
  }),
]);

export type TEsimPurchaseInput = z.infer<typeof esimPurchaseSchema>;
