import { type Response } from "express";

export function sendResponse(
  res: Response,
  statusCode: number = 200,
  message: string | null,
  data: Record<string, any> | string | null = null
) {
  const hasToken = !!res.locals?.accessToken && !!res.locals?.refreshToken;
  const tokens = {
    newAccessToken: "",
    newRefreshToken: "",
  };

  if (res.locals?.accessToken)
    tokens["newAccessToken"] = res.locals.accessToken;
  if (res.locals?.refreshToken)
    tokens["newRefreshToken"] = res.locals.refreshToken;

  res.status(statusCode).json({
    success: true,
    data,
    ...(hasToken && { tokens }),
    responseCode: statusCode,
    message: message ?? "Success",
  });
}
