import {
  AppError,
  giftcardServiceCheck,
  sendResponse,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { reloadlyCountries } from "@/provider";

export const retrieveGiftcardCountries = catchAsync(async (req, res) => {
  const checkService = await giftcardServiceCheck();

  if (!checkService) {
    throw new AppError("Service not available");
  }

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.RELOADLY.toLowerCase()) {
    // The function already caches
    response = await reloadlyCountries();
  }

  if (response?.error || !response?.data) {
    throw new AppError("Unable to retrieve countries", 404);
  }

  return sendResponse(res, 200, null, response.data);
});
