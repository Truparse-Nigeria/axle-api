import {
  AppError,
  giftcardServiceCheck,
  sendResponse,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { reloadlyCategories } from "@/provider";

export const retrieveGiftcardCategories = catchAsync(async (req, res) => {
  const checkService = await giftcardServiceCheck();

  if (!checkService) {
    throw new AppError("Service not available");
  }

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.RELOADLY.toLowerCase()) {
    response = await reloadlyCategories();
  }

  if (response?.error || !response?.data) {
    throw new AppError("Unable to retrieve categories", 404);
  }

  return sendResponse(res, 200, null, response.data);
});
