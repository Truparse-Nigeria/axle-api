import {
  AppError,
  billServiceCheck,
  sendResponse,
  ServiceCheck,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { safehavenBanks } from "@/provider";

export const retrieveBanks = catchAsync(async (req, res) => {
  const checkService = await billServiceCheck(
    "moneyTransfer",
    ServiceCheck.WALLET_TO_BANK,
  );

  if (!checkService) {
    throw new AppError("Service not available");
  }

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.SAFE_HAVEN.toLowerCase()) {
    // safehavenBanks already caches the list
    response = await safehavenBanks();
  }

  if (response?.error || !response?.data) {
    throw new AppError("Unable to retrieve banks", 404);
  }

  return sendResponse(res, 200, null, response.data);
});
