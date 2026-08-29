import { z } from "zod";
import { FiatCurrencyEnum, GloesimPackageTypeEnum } from "../enum";

export const esimPackagesRetrieveSchema = z.object({
  countryId: z.coerce
    .number()
    .int("countryId must be an integer")
    .positive("countryId must be greater than zero"),
  packageType: z.nativeEnum(GloesimPackageTypeEnum),
  page: z.coerce.number().int().positive().optional().default(1),
});

// Fields every purchase needs regardless of package type. `packageId` is the
// provider package id (used both to price the package and as the purchase's
// `package_type_id`). Currency is the wallet the user pays from and defaults to
// NGN — packages are priced in Naira on our side.
const esimPurchaseBase = {
  packageId: z.string().min(1, "packageId is required"),
  pin: z.string().min(1, "pin is required"),
  currency: z
    .nativeEnum(FiatCurrencyEnum)
    .optional()
    .default(FiatCurrencyEnum.NGN),
};

// The purchase payload shape depends on the package type:
//   - DATA-ONLY plans only need the package (plus an optional existing eSIM to
//     top up via its iccid).
//   - DATA-VOICE-SMS plans provision a real number, so they require the
//     subscriber's KYC/address details.
export const esimPurchaseSchema = z.discriminatedUnion("packageType", [
  z.object({
    packageType: z.literal(GloesimPackageTypeEnum.DATA_ONLY),
    ...esimPurchaseBase,
    iccid: z.string().min(1).optional(),
  }),
  z.object({
    packageType: z.literal(GloesimPackageTypeEnum.DATA_VOICE_SMS),
    ...esimPurchaseBase,
    // The provider only needs the device IMEI to provision a number; it may be
    // sent empty when the device IMEI is not collected.
    imei: z.string().optional().default(""),
  }),
]);

export type TEsimPurchaseInput = z.infer<typeof esimPurchaseSchema>;
