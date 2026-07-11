import type { ZodSchema, ZodError } from "zod";
import AppError from "./app-error";

function formatPath(path: PropertyKey[]): string {
  // Capitalize and join nested fields
  return path
    .map((segment) => {
      if (typeof segment === "number") return `[${segment}]`;
      const key = String(segment);
      return key.charAt(0).toUpperCase() + key.slice(1);
    })
    .join(" → ");
}

function flattenZodErrors(error: ZodError) {
  return error.issues.map((err) => {
    const path = formatPath(err.path);

    // If the message already contains the field name, don't prepend path
    const hasFieldName =
      path && err.message.toLowerCase().includes(path.toLowerCase());

    return path && !hasFieldName ? `${path} ${err.message}` : err.message;
  });
}

export const validateRequestPayload = async <T>(
  payload: Record<string, any>,
  schema: ZodSchema<T>
): Promise<T | never> => {
  const result = await schema.safeParseAsync(payload);

  if (!result.success) {
    const errorMessages = flattenZodErrors(result.error);

    throw new AppError(errorMessages[0] ?? "Invalid request payload", 422, {
      errors: errorMessages,
    });
  }

  return result.data as T;
};