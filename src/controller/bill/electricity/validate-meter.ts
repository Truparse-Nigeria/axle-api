import {
  AppError,
  billServiceCheck,
  sendResponse,
  validateMeterNumberSchema,
  validateRequestPayload,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { vtpassVerifyMeter } from "@/provider";

export const validateMeterNumber = catchAsync(async (req, res) => {
  const { meterNumber, disco, type } = await validateRequestPayload(
    req.body,
    validateMeterNumberSchema,
  );

  // Check if electricity service or disco is available
  const checkService = await billServiceCheck("electricity", disco);
  if (!checkService) {
    throw new AppError("Service not available");
  }

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.VTPASS.toLowerCase()) {
    response = await vtpassVerifyMeter({
      billersCode: meterNumber,
      serviceID: checkService.slug,
      type,
    });
  }

  if (!response?.data || response?.error) {
    throw new AppError("Unable to validate meter number", 404);
  }

  return sendResponse(res, 200, null, response.data);
});
