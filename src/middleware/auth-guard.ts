import {
  AppError,
  clearToken,
  ENVIRONMENT,
  getModel,
  tokenPair,
  verifyToken,
  type AccessTypeEnum,
  type TUser,
} from "@/common";
import type { Request, Response } from "express";
import { catchAsync } from "./catch-async";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TUser;
      meta?: Record<string, any>;
      "x-access-time"?: number;
    }
  }
}

const clear = async (
  req: Request,
  res: Response,
  accessType: AccessTypeEnum,
  user?: TUser,
) => {
  // clear token
  clearToken(req, res, accessType);
  await getModel(accessType).findByIdAndUpdate(
    user!._id,
    { jti: "" },
    { new: true },
  );
};

export const authGuard = (accessType: AccessTypeEnum) =>
  catchAsync(async (req, res, next) => {
    const ATN = ENVIRONMENT.JWT[accessType].ACCESS_TOKEN_NAME! as string;
    const ATS = ENVIRONMENT.JWT[accessType].ACCESS_TOKEN_SECRET! as string;
    const RTN = ENVIRONMENT.JWT[accessType].REFRESH_TOKEN_NAME! as string;
    const RTS = ENVIRONMENT.JWT[accessType].REFRESH_TOKEN_SECRET! as string;

    // Get token from header or cookie
    const accessToken = req.headers[ATN] || req.cookies[ATN];
    const refreshToken = req.headers[RTN] || req.cookies[RTN];

    // Decode both of them
    const verifiedAccessToken = await verifyToken(accessToken, ATS);
    const verifiedRefreshToken = await verifyToken(refreshToken, RTS);

    if (!verifiedRefreshToken) {
      clearToken(req, res, accessType);
      throw new AppError("Invalid token. Please log in", 401);
    }

    const user = await getModel(accessType)
      .findById(verifiedRefreshToken?.id)
      .select("+jti +passcode +pin");

    if (!user) {
      throw new AppError("Expired session", 401);
    }

    // Make further checks
    if (verifiedRefreshToken?.jti !== user?.jti) {
      clear(req, res, accessType, user as TUser);
      throw new AppError("Invalid token. Session expired", 401);
    }

    // attach user to request
    req.user = user as TUser;

    req.meta = {
      deviceIdInfo: req.headers["device-info"]?.toString() || "",
      appVersion: req.headers["app-version"]?.toString() || "",
      buildNumber: req.headers["build-number"]?.toString() || "",
      deviceBrand: req.headers["device-brand"]?.toString() || "",
      deviceModel: req.headers["device-model"]?.toString() || "",
      deviceOsVersion: req.headers["device-os-version"]?.toString() || "",
      deviceOs: req.headers["device-os"]?.toString() || "",
    };

    // check if access token has expired
    if (!verifiedAccessToken) {
      await tokenPair(req, res, { id: String(user._id) }, accessType);
    }

    next();
  });
