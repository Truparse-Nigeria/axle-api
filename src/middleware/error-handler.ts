import { AppError, IS_DEVELOPMENT } from "@/common";
import type { NextFunction, Request, Response } from "express";
import type { MongooseError } from "mongoose";

// Handle duplicate fields when using mongoose
const handleMongooseDuplicateFieldsError = (
  err: { code: number; keyValue: { [key: string]: any } },
  next: NextFunction
): AppError | void => {
  if (err.code === 11000) {
    const field =
      Object.keys(err?.keyValue ?? {})[0] ??
      ""
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .split(/(?=[A-Z])/)
        .map((word, index) =>
          index === 0
            ? word.charAt(0).toUpperCase() + word.slice(1)
            : word.toLowerCase()
        )
        .join("");

    const value = err.keyValue[field.toLowerCase()];
    const message = `${field} "${value}" has already been used!.`;
    return new AppError(message, 409);
  } else {
    next(err);
  }
};

const sendDevelopmentError = (err: any, statusCode: number, res: Response) => {
  res.status(statusCode).json({
    success: false,
    data: err.data || null,
    responseCode: statusCode,
    message: err?.message,
  });
};

const sendProductionError = (err: any, statusCode: number, res: Response) => {
  if (err?.isOperational) {
    res.status(statusCode).json({
      success: false,
      data: err.data,
      responseCode: statusCode,
      message: err?.message ?? "Well, this is awkward... Try again?",
    });
  } else {
    res.status(statusCode).json({
      success: false,
      data: null,
      responseCode: statusCode,
      message: "Well, this is awkward... Try again?",
    });
  }
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;

  if (IS_DEVELOPMENT) {
    sendDevelopmentError(err, statusCode, res);
  } else {
    if ((err as MongooseError & { code: number }).code === 11000) {
      err = handleMongooseDuplicateFieldsError(err, next);
    }
    sendProductionError(err, statusCode, res);
  }
};
