import { sendResponse, StateCity } from "@/common";
import { catchAsync } from "@/middleware";

export const getStateAndCity = catchAsync(async (_req, res) => {
  return sendResponse(res, 200, "State and city retrieved successfully", StateCity);
});
