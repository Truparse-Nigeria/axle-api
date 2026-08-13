import {
  AppError,
  cardRateService,
  CardVariantEnum,
  sendResponse
} from "@/common";
import { catchAsync } from "@/middleware";

export const cardRate = catchAsync(async (req, res) => {
  const { variant } = req.params;

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  const checkService = await cardRateService(variant as CardVariantEnum);

  if (!checkService) throw new AppError("Service not available");

  const { base, funding, withdrawal } = checkService;

  const rate = {
    buy: base + funding,
    sell: base - withdrawal,
  };

  return sendResponse(res, 200, null, rate);
});
