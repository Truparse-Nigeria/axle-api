import type { CookieOptions, Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { promisify } from "util";
import { ENVIRONMENT } from "../config";
import { generateRandomString } from "./helper";
import type { AccessTypeEnum } from "../interface";

type expiresIn = `${number}${"s" | "m" | "h" | "d"}`;

export const createToken = (
  payload: Record<string, unknown>,
  options?: SignOptions,
  secret?: string,
) => {
  const token = jwt.sign(
    payload,
    secret || (ENVIRONMENT.JWT.USER.ACCESS_TOKEN_SECRET as string),
    {
      expiresIn:
        options?.expiresIn ||
        (ENVIRONMENT.JWT.USER.ACCESS_TOKEN_EXPIRES_IN as expiresIn),
      ...options,
    },
  );
  return token;
};

// Asynchronously verify given token
export const verifyToken = async (token: string, secret?: string) => {
  const verifyAsync: (arg1: string, arg2: string) => jwt.JwtPayload = promisify(
    jwt.verify,
  );
  return verifyAsync(
    token,
    secret ? secret : (ENVIRONMENT.JWT.USER.ACCESS_TOKEN_SECRET as string),
  ).catch((err: unknown) => err);
};

export const isPostman = (req: Request) => {
  return req.headers["user-agent"]?.includes("Postman");
};

export const setCookie = (
  req: Request,
  res: Response,
  name: string,
  value: string,
  options: CookieOptions = {},
) => {
  res.cookie(name, value, {
    httpOnly: true,
    secure: !isPostman(req),
    path: "/",
    sameSite: "none",
    partitioned: true,
    ...options,
  });
};

// Create access token and refresh token
export const tokenPair = async (
  req: Request,
  res: Response,
  payload: Record<string, unknown>,
  userType: AccessTypeEnum,
) => {
  const jti = generateRandomString(16);
  const accessToken = createToken(
    { ...payload, jti },
    {
      expiresIn: ENVIRONMENT.JWT[userType].ACCESS_TOKEN_EXPIRES_IN as expiresIn,
    },
    ENVIRONMENT.JWT[userType].ACCESS_TOKEN_SECRET as string,
  );
  const refreshToken = createToken(
    { ...payload, jti },
    {
      expiresIn: ENVIRONMENT.JWT[userType]
        .REFRESH_TOKEN_EXPIRES_IN as expiresIn,
    },
    ENVIRONMENT.JWT[userType].REFRESH_TOKEN_SECRET as string,
  );

  if (!req.headers?.["app-version"]) {
    const maxAge = Number(ENVIRONMENT.JWT[userType].ACCESS_COOKIE_EXPIRES_IN);
    const refreshMaxAge = Number(
      ENVIRONMENT.JWT[userType].REFRESH_COOKIE_EXPIRES_IN,
    );
    setCookie(
      req,
      res,
      ENVIRONMENT.JWT[userType].ACCESS_TOKEN_NAME as string,
      accessToken,
      {
        maxAge: maxAge * 60 * 60 * 1000,
      },
    );
    setCookie(
      req,
      res,
      ENVIRONMENT.JWT[userType].REFRESH_TOKEN_NAME as string,
      refreshToken,
      {
        maxAge: refreshMaxAge * 60 * 60 * 1000,
      },
    );
  } else {
    res.locals.accessToken = accessToken;
    res.locals.refreshToken = refreshToken;
  }

  return jti;
};
