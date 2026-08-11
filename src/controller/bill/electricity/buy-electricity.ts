import {
  ActivityEnum,
  AppError,
  billServiceCheck,
  chargeUser,
  DiscosEnum,
  FiatCurrencyEnum,
  generateRequestID,
  payElectricitySchema,
  PurposeEnum,
  refundUser,
  runCheck,
  sendResponse,
  StatusEnum,
  statusMessage,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction } from "@/model";
import { vtpassPay } from "@/provider";

export const purchaseElectricity = catchAsync(async (req, res) => {
  const { amount, meterNumber, type, disco, pin } =
    await validateRequestPayload(req.body, payElectricitySchema);

  // Source and destination currency are both NGN for electricity, so the
  // exchange rate is always 1.
  const currency = FiatCurrencyEnum.NGN;

  const user = req.user;
  if (!user) {
    throw new AppError("User not found");
  }

  // Check if service is available
  const checkService = await billServiceCheck("electricity", disco);
  if (!checkService) {
    throw new AppError("Service not available");
  }

  // Total amount (amount + service charge)
  const totalAmount = amount + checkService.charge;

  await runCheck({ user, amount: totalAmount, currency, pin });
  delete req.body.pin;

  // Charge user
  const updatedUser = await chargeUser({ user, amount: totalAmount, currency });

  const balance = updatedUser.wallet.fiat[currency]?.balance || 0;

  const reference = generateRequestID();

  const txnPayload: ITransactionPayload = {
    user: user._id as unknown as string,
    reference,
    amount: totalAmount,
    activity: ActivityEnum.DEBIT,
    sourceCurrency: currency,
    destinationCurrency: currency,
    exchangeRate: 1,
    description: TxnDesc.electricity,
    provider: checkService.name.toLowerCase(),
    purpose: PurposeEnum.POWER,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + totalAmount,
    finalBalance: balance + totalAmount,
    view: {
      service: DiscosEnum[checkService.code as keyof typeof DiscosEnum],
      disco: checkService.code,
      reference,
      description: TxnDesc.electricity,
      meter: meterNumber,
      fee: checkService.charge,
      amount,
      total: totalAmount,
      phone: user.phone,
      meterType: type,
    },
    meta: { ...req.meta },
  };

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.VTPASS.toLowerCase()) {
    response = await vtpassPay({
      serviceID: checkService.slug,
      billersCode: meterNumber,
      variation_code: type,
      phone: user.phone,
      amount,
      request_id: reference,
    });
  }

  const status = response?.data?.meta?.status;

  if (response?.error || status === StatusEnum.FAILED) {
    await Transaction.create({
      ...txnPayload,
      status: StatusEnum.FAILED,
      responsePayload: response,
    });

    // Return the money we already debited before bailing out
    await refundUser({ user, amount: totalAmount, currency });

    throw new AppError(
      response?.error?.message ||
        response?.data?.message ||
        `Oh Snap! Electricity transaction ${statusMessage(status!)}`,
    );
  }

  // Pull the token, units and customer details out of the vendor response.
  // VTpass is inconsistent with casing, so we fall back across variants.
  txnPayload.view.token =
    response?.data?.purchased_code?.replace(/[Token :]/g, "") ||
    response?.data?.token?.replace(/[Token :]/g, "") ||
    response?.data?.mainToken ||
    response?.data?.Token?.replace(/[Token :]/g, "") ||
    "----";
  txnPayload.view.unit =
    response?.data?.units ||
    response?.data?.mainTokenUnits ||
    response?.data?.Units ||
    "----";
  txnPayload.view.meterName =
    response?.data?.customerName?.trim() ||
    response?.data?.CustomerName?.trim() ||
    "----";
  txnPayload.view.meterAddress =
    response?.data?.customerAddress?.trim() ||
    response?.data?.CustomerAddress?.trim() ||
    "----";
  txnPayload.view.kct1 = response?.data?.kct1 || response?.data?.KCT1 || undefined;
  txnPayload.view.kct2 = response?.data?.kct2 || response?.data?.KCT2 || undefined;

  await Transaction.create({
    ...txnPayload,
    settlement: checkService.charge + (checkService.rate / 100) * amount,
    status,
    responsePayload: response,
    finalBalance: balance,
  });

  sendResponse(
    res,
    200,
    `Electricity purchase ${statusMessage(status!)}`,
    txnPayload.view,
  );
});
