import {
  AppError,
  esimPackagesRetrieveSchema,
  esimServiceCheck,
  sendResponse,
  validateRequestPayload,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { gloesimPackagesByCountry } from "@/provider";

export const retrieveEsimPackages = catchAsync(async (req, res) => {
  const { countryId, packageType, page } = await validateRequestPayload(
    { ...req.params, ...req.query },
    esimPackagesRetrieveSchema,
  );

  // Confirms eSIM is enabled and resolves the enabled provider's pricing
  // (markup % + Naira-per-USD rate).
  const checkService = await esimServiceCheck();

  if (!checkService) {
    throw new AppError("Service not available");
  }

  let response = null;

  if (checkService.slug === VendorEnum.GLOESIM) {
    response = await gloesimPackagesByCountry(
      countryId,
      packageType,
      { markup: checkService.markup, rate: checkService.rate },
      page,
    );
  }

  if (response?.error || !response?.data) {
    throw new AppError("Unable to retrieve packages", 404);
  }

  return sendResponse(res, 200, null, response.data);
});
