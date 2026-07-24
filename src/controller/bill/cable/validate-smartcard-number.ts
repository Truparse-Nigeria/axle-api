import {
  AppError,
  billServiceCheck,
  sendResponse,
  validateRequestPayload,
  validateSmartcardNumberSchema,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { vtpassVerifyCable } from "@/provider";

export const validateSmartcardNumber = catchAsync(async (req, res) => {
  const { smartcardNumber, entity } = await validateRequestPayload(
    req.body,
    validateSmartcardNumberSchema,
  );

  const checkService = await billServiceCheck("cable", entity);
  if (!checkService) {
    throw new AppError("Service not available");
  }

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.VTPASS.toLowerCase()) {
    response = await vtpassVerifyCable({
      billersCode: smartcardNumber,
      serviceID: checkService.slug,
    });
  }

  if (!response?.data || response?.error) {
    throw new AppError("Unable to validate smart card number", 404);
  }

  return sendResponse(res, 200, null, response.data);
});
