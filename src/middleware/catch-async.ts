import type { NextFunction, Request, Response } from "express";

type catchAsyncErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<Response | void>;

export const catchAsync =
  (fn: catchAsyncErrors) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
