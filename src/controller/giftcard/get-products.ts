import {
  AppError,
  giftcardProductsRetrieveSchema,
  giftcardServiceCheck,
  sendResponse,
  validateRequestPayload,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { reloadlyProducts } from "@/provider";

export const retrieveGiftcardProducts = catchAsync(async (req, res) => {
  const checkService = await giftcardServiceCheck();

  if (!checkService) {
    throw new AppError("Service not available");
  }

  const { size, page, countryCode, productName, productCategoryId } =
    await validateRequestPayload(req.query, giftcardProductsRetrieveSchema);

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.RELOADLY.toLowerCase()) {
    const nairaRatePerUSD = checkService.rateMarkup + checkService.rate;

    response = await reloadlyProducts(
      {
        size,
        page,
        countryCode,
        productName,
        includeRange: true, // Constant behavior, no need to change.
        productCategoryId,
        includeFixed: true, // Constant behavior, no need to change.
      },
      nairaRatePerUSD,
    );
  }

  if (response?.error || !response?.data) {
    throw new AppError("Unable to retrieve products", 404);
  }

  return sendResponse(res, 200, null, response.data);
});
