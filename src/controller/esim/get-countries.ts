import { AppError, sendResponse } from "@/common";
import { catchAsync } from "@/middleware";
import { gloesimCountry } from "@/provider";

export const retrieveEsimCountries = catchAsync(async (_req, res) => {
  // gloesimCountry caches the (stable) country list internally.
  const response = await gloesimCountry();

  if (response?.error || !response?.data) {
    throw new AppError("Unable to retrieve countries", 404);
  }

  return sendResponse(res, 200, null, response.data);
});
