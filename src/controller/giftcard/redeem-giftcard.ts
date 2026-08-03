import {
  AppError,
  giftcardServiceCheck,
  redeemGiftcardSchema,
  sendResponse,
  validateRequestPayload,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { reloadlyRedeemGiftcard } from "@/provider";

export const redeemGiftcard = catchAsync(async (req, res) => {
  const checkService = await giftcardServiceCheck();

  if (!checkService) {
    throw new AppError("Service not available");
  }

  const { transactionId } = await validateRequestPayload(
    req.params,
    redeemGiftcardSchema,
  );

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.RELOADLY.toLowerCase()) {
    response = await reloadlyRedeemGiftcard(transactionId);
  }

  if (response?.error || !response?.data) {
    throw new AppError("Unable to redeem giftcard", 404);
  }

  return sendResponse(res, 200, null, response.data);
});
