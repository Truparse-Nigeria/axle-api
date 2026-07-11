import { differenceInSeconds, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { customAlphabet } from "nanoid";
import { ENVIRONMENT } from "../config";

export const createHash = async (value: string) => {
  return await Bun.password.hash(value, {
    algorithm: "bcrypt",
    cost: 12,
  });
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const zonedTime = (date: Date) => {
  const timezone = "Africa/Lagos";
  const now = toZonedTime(date, timezone);
  return now;
};

export const secondsUntilEndOfDay = () => {
  const now = zonedTime(new Date());
  const endOfToday = endOfDay(now);

  return differenceInSeconds(endOfToday, now);
};

export const compareHash = async (value: string, hash: string) => {
  return await Bun.password.verify(value, hash).catch(() => false);
};

export const generateRandomString = (
  length: number,
  prefix?: string,
): string => {
  const nanoid = customAlphabet(
    "123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ",
    length,
  );
  return prefix ? `${prefix}-${nanoid()}` : nanoid();
};

export const generateRandomCode = (length: number, prefix?: string): string => {
  const nanoid = customAlphabet("123456789BACDEFGHIJKLMNPQRSTUVWXYZ", length);
  return prefix ? `${prefix}-${nanoid()}` : nanoid();
};


export const IS_DEVELOPMENT = ENVIRONMENT.APP.ENV === "development";
