import { z } from "zod";
import { KycEnum } from "../enum";
import { StateCity } from "../constant";

export const identityLookupSchema = z.object({
  type: z.enum([KycEnum.BVN, KycEnum.NIN]),
  identifier: z.string().trim().min(1),
});

export const kycVerifySchema = z.object({
  finalizer: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phoneNumber: z.string().trim().regex(/^(070|080|081|090|091)\d{8}$/, "Invalid phone number"),
  dateOfBirth: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2}|\d{2}-[A-Za-z]{3}-\d{4})$/, "Invalid date format"),
});

const stateNames = StateCity.map((state) => state.name);
export const kycAddressSchema = z.object({
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional(),
  state: z.enum(stateNames as [string, ...string[]]),
  city: z.string().trim().min(1),
  country: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
}).refine((data) => StateCity.find((state) => state.name === data.state)?.cities.includes(data.city), {
  message: "City/LGA doesn't belong to selected state", path: ["city"],
});

export const kycSelfieSchema = z.object({ selfie: z.url() });
