import { z } from "zod";
import { GloesimPackageTypeEnum } from "../enum";

export const esimPackagesRetrieveSchema = z.object({
  countryId: z.coerce
    .number()
    .int("countryId must be an integer")
    .positive("countryId must be greater than zero"),
  packageType: z.nativeEnum(GloesimPackageTypeEnum),
  page: z.coerce.number().int().positive().optional().default(1),
});
