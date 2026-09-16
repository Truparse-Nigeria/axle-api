import { format, isValid, parse } from "date-fns";
import { User } from "@/model";
import type { IKycDetailSchema, IKycSchema } from "../interface";
import { KycEnum } from "../enum";
import AppError from "./app-error";
import { safeDecryptData } from "./encryption";

export const normalizeKycDate = (value: string) => {
  const date = /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(value)
    ? parse(value, "dd-MMM-yyyy", new Date())
    : parse(value, "yyyy-MM-dd", new Date());
  if (!isValid(date)) throw new AppError("Invalid date of birth", 400);
  return format(date, "yyyy-MM-dd");
};

const nameTokens = (value?: string) => (value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
const containsName = (name: string | undefined, stored: Set<string>) => {
  const tokens = nameTokens(name);
  return tokens.length > 0 && tokens.every((token) => stored.has(token));
};

export const assertKycIdentityConsistency = (
  kyc: IKycSchema | undefined,
  type: KycEnum.BVN | KycEnum.NIN | KycEnum.PASSPORT,
  details: Pick<IKycDetailSchema, "firstName" | "lastName" | "dateOfBirth"> & { middleName?: string },
) => {
  if (!kyc) return;
  const dob = normalizeKycDate(safeDecryptData(details.dateOfBirth));
  for (const otherType of [KycEnum.BVN, KycEnum.NIN, KycEnum.PASSPORT] as const) {
    if (otherType === type) continue;
    const existing = kyc[otherType];
    if (existing?.completed !== true || !existing.details) continue;
    if (normalizeKycDate(safeDecryptData(existing.details.dateOfBirth)) !== dob) {
      throw new AppError(`KYC details do not match completed ${otherType} date of birth`, 400);
    }
    const stored = new Set([
      ...nameTokens(existing.details.firstName),
      ...nameTokens(existing.details.middleName),
      ...nameTokens(existing.details.lastName),
    ]);
    if (!containsName(details.lastName, stored) ||
      !(containsName(details.firstName, stored) || containsName(details.middleName, stored))) {
      throw new AppError(`KYC details do not match completed ${otherType} name`, 400);
    }
  }
};

export const throwIfIdentifierHasBeenUsed = async (identifier: string, type: KycEnum.BVN | KycEnum.NIN, userId: string) => {
  if (await User.exists({ _id: { $ne: userId }, [`kyc.${type}.identifier`]: identifier })) {
    throw new AppError(`This ${type.toUpperCase()} has already been used by another account`, 409);
  }
};

export const maskPhone = (phone: string) => phone.replace(/^234/, "0").replace(/(?<=\d{4})\d(?=\d{3})/g, "*");
