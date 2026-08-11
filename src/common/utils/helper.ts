import { differenceInSeconds, endOfDay, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { customAlphabet } from "nanoid";
import mongoose from "mongoose";
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

// In-flight request registry, keyed by an arbitrary identifier
const ongoingRequests = new Map<string, Promise<any>>();

/**
 * Collapses concurrent calls that share the same key into a single in-flight
 * request. While one call is running, later callers with the same key await the
 * same promise instead of firing duplicate requests (e.g. token refresh).
 */
export const deduplicationHandler = async (
  key: string,
  requestHandler: () => Promise<any>,
) => {
  if (ongoingRequests.has(key)) {
    return await ongoingRequests.get(key);
  }

  const requestPromise = requestHandler();
  ongoingRequests.set(key, requestPromise);

  try {
    return await requestPromise;
  } finally {
    ongoingRequests.delete(key);
  }
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

// Turn a "+field1 +field2" projection string into ["field1", "field2"]
export const reformatSensitiveFields = (sensitiveFields: string) => {
  return sensitiveFields.replace(/\+/g, "").split(" ");
};

// Delete a "+field1 +nested.field" set of keys from a plain object (in place).
// Pairs with the SENSITIVE_* constants for stripping single-object responses.
export const deleteFields = <T>(obj: T, fields: string): T => {
  const fieldsToDelete = fields
    .split(" ")
    .map((f) => f.replace("+", "").trim())
    .filter((f) => f);

  if (!obj || typeof obj !== "object" || fieldsToDelete.length === 0) {
    return obj;
  }

  fieldsToDelete.forEach((field) => {
    if (field.includes(".")) {
      // Handle nested fields
      const parts = field.split(".");
      let current: Record<string, any> = obj;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!part || !current[part] || typeof current[part] !== "object") {
          // Path doesn't exist, nothing to delete
          return;
        }
        current = current[part];
      }

      const lastPart = parts[parts.length - 1];
      if (lastPart && Object.prototype.hasOwnProperty.call(current, lastPart)) {
        delete current[lastPart];
      }
    } else {
      // Handle top-level fields
      if (Object.prototype.hasOwnProperty.call(obj, field)) {
        delete (obj as Record<string, any>)[field];
      }
    }
  });

  return obj;
};

export const convertToObjectIds = (
  obj: Record<string, any>,
  skipObjectIdConversion?: string[],
): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];

    // Avoid converting if already an ObjectId
    if (
      typeof value === "string" &&
      mongoose.Types.ObjectId.isValid(value) &&
      !skipObjectIdConversion?.includes(key)
    ) {
      result[key] = new mongoose.Types.ObjectId(value);
    } else {
      result[key] = value;
    }
  }

  return result;
};

// Changes object to dot notation Eg. meta.card.id
export const toDotNotation = (obj: any, prefix = "") => {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;

      // detect Mongo operator ($in, $gte, $and, $or, etc.)
      if (key.startsWith("$")) {
        // Top-level operators (e.g. $and / $or at root) — pass through as-is
        // so their array sub-filters reach Mongo unchanged.
        if (!prefix) {
          acc[key] = value;
          return acc;
        }
        // Otherwise keep the operator grouped under the parent field
        acc[prefix] = {
          ...(acc[prefix] || {}),
          [key]: value,
        };
        return acc;
      }

      const isPlainObject =
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !(value instanceof mongoose.Types.ObjectId);

      if (isPlainObject) {
        Object.assign(acc, toDotNotation(value, newKey));
      } else {
        acc[newKey] = value;
      }

      return acc;
    },
    {} as Record<string, any>,
  );
};

export const escapeRegex = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const prepareFilterForAggregation = (
  filter: Record<string, any>,
  skipObjectIdConversion?: string[],
) => {
  const dotFilter = toDotNotation(filter);
  const converted = convertToObjectIds(dotFilter, skipObjectIdConversion);

  // Transform plain strings to case-insensitive exact-match regex
  for (const key in converted) {
    const value = converted[key];

    // Skip ObjectIds, Dates, arrays, operators, etc.
    if (
      typeof value === "string" &&
      !mongoose.Types.ObjectId.isValid(value) &&
      !key.startsWith("$")
    ) {
      converted[key] = { $regex: `^${escapeRegex(value)}$`, $options: "i" };
    }
  }

  return converted;
};
