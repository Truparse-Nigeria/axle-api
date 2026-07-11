import { CustomError } from "ts-custom-error";

export default class AppError extends CustomError {
  statusCode: number;
  isOperational: boolean;
  data?: unknown;

  constructor(message: string, statusCode: number = 400, data?: unknown) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;
    this.data = data;

    Error.captureStackTrace(this, this.constructor);
  }
}
