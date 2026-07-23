import { differenceInSeconds, endOfDay, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { customAlphabet } from "nanoid";
import { ENVIRONMENT } from "../config";
import { isAxiosError } from "axios";
import { StatusEnum } from "../enum";
import type { ISettings } from "../interface";

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


// Human-readable, timezone-stamped reference for a transaction
export const generateRequestID = (prefix?: string) => {
  const timezone = "Africa/Lagos";
  const now = toZonedTime(new Date(), timezone);
  const formattedDate = format(now, "yyyyMMddHHmm");
  const randomString = generateRandomCode(12, prefix);

  return `${formattedDate}x${randomString?.replace("-", "")}`;
};

export const statusMessage = (status: StatusEnum): string => {
  const messages: Record<StatusEnum, string> = {
    [StatusEnum.SUCCESS]: "successful",
    [StatusEnum.PROCESSING]: "processing",
    [StatusEnum.FAILED]: "failed",
    [StatusEnum.REVERSAL]: "reversed",
  };

  return messages[status] ?? "unknown";
};

export const IS_DEVELOPMENT = ENVIRONMENT.APP.ENV === "development";

export const parseError = (error: unknown) => {
  if (isAxiosError(error)) {
    if (error.response?.data) {
      return {
        errorData: error.response.data,
        message:
          error.response.data?.message ||
          error.response.data?.msg ||
          "Error with response data",
      };
    }
    if (error.response) {
      return { errorData: error.response, message: "Error with response" };
    }
  }

  if (error instanceof Error) {
    // Check if the Error has a `data` field
    const maybeWithData = error as Error & {
      data?: { message?: string; msg?: string };
    };
    return {
      errorData: null,
      message:
        maybeWithData.data?.message ||
        maybeWithData.data?.msg ||
        maybeWithData.message,
    };
  }

  // If it's neither an AxiosError nor a standard Error
  const maybeUnknown = error as { data?: { message?: string; msg?: string } };
  return {
    errorData: null,
    message:
      maybeUnknown?.data?.message || maybeUnknown?.data?.msg || "Unknown Error",
  };
};

// Strips the internal-only keys before the settings are handed to a client.
// Possible consideration against modifying the object directly?
export const sortSettings = (val: ISettings, seen = new WeakSet<object>()) => {
  if (typeof val !== "object" || val === null) {
    return val;
  }

  // prevent infinite recursion
  if (seen.has(val)) {
    return val;
  }

  seen.add(val);

  const obj = val as Record<string, any>;

  Object.keys(obj).forEach((key) => {
    // remove unwanted keys
    if (
      ["customRates", "providerCreationFee", "providerPercent"].includes(key)
    ) {
      delete obj[key];
      return;
    }

    if (key === "providers") {
      delete obj[key];
      return;
    }

    const value = obj[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sortSettings(value, seen);
    }
  });

  return val;
};

export const messageVtpass = (code: string) => {
  switch (code) {
    case "000":
      return "Transaction successful";
    case "013":
      return "Amount too low. Please increase the amount.";
    case "019":
      return "Possible duplicate detected. Please try again after 15 seconds.";
    case "011":
      return "Some information appears to be incorrect. Please review and try again.";
    default:
      return "";
  }
};
