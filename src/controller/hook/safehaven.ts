import {
  AppError,
  createTxnAndTopupAbstract,
  currency,
  logger,
  SafehavenHookAbstract,
  sendResponse,
  VendorEnum,
  type ISafeHavenHook,
} from "@/common";
import { catchAsync } from "@/middleware";
import { createJob } from "@/queue";
import mongoose, { sanitizeFilter } from "mongoose";

export const safehavenHook = catchAsync(async (req, res) => {
  const payload = sanitizeFilter(req.body) as ISafeHavenHook;

  if (payload.eventType === "account.debit") {
    sendResponse(res, 200, "We don't do that here");
    return;
  }

  const validate = await SafehavenHookAbstract(payload.data, res);

  if (!validate) {
    logger.error("Transaction not processed");
    throw new AppError("Transaction not processed");
  }

  const { view, reference, fundedAmount, entityId: userId } = validate;

  const session = await mongoose.startSession();
  const data = await session.withTransaction(async () => {
    return await createTxnAndTopupAbstract({
      userId,
      fundedAmount,
      reference,
      view,
      requestPayload: payload.data,
      session,
      fullPayload: payload,
      provider: VendorEnum.SAFE_HAVEN,
    });
  });

  await session.endSession();

  if (!data) {
    throw new AppError("Transaction not processed");
  }

  // Notify the user of the inbound credit
  if (data.updatedUser?.email) {
    createJob({
      type: "SEND_EMAIL",
      to: data.updatedUser.email,
      subject: "Bank Transfer",
      template: `You've been credited ₦${currency(fundedAmount)} in your NGN wallet.`,
    });
  }

  return sendResponse(res, 200, null, data.createdTransaction);
});
