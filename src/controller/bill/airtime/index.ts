import {
  ActivityEnum,
  AppError,
  billServiceCheck,
  chargeUser,
  FiatCurrencyEnum,
  generateRequestID,
  logger,
  payAirtimeSchema,
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

export const purchaseAirtime = catchAsync(async (req, res) => {
  const { network, phone, amount, pin } = await validateRequestPayload(
    req.body,
    payAirtimeSchema,
  );

  // Source and destination currency are both NGN for airtime, so the
  // exchange rate is always 1.
  const currency = FiatCurrencyEnum.NGN;

  const user = req.user;
  if (!user) {
    throw new AppError("User not found");
  }

  await runCheck({ user, amount, currency, pin });
  delete req.body.pin;

  // Check if service is available
  const checkService = await billServiceCheck("airtime", network);
  if (!checkService) {
    throw new AppError("Service not available");
  }

  // Charge user
  const updatedUser = await chargeUser({ user, amount, currency });

  const balance = updatedUser.wallet.fiat[currency]?.balance || 0;

  const reference = generateRequestID();

  const txnPayload: ITransactionPayload = {
    user: user._id as unknown as string,
    reference,
    amount,
    activity: ActivityEnum.DEBIT,
    sourceCurrency: currency,
    destinationCurrency: currency,
    exchangeRate: 1,
    description: TxnDesc.airtimePurchase,
    provider: checkService.name.toLowerCase(),
    purpose: PurposeEnum.AIRTIME,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + amount,
    finalBalance: balance + amount,
    view: {
      network: checkService.entityName,
      reference,
      description: TxnDesc.airtimePurchase,
      phone,
      amount,
      total: amount,
    },
    meta: { ...req.meta },
  };

  const response = await buyAirtime({
    checkService,
    phone,
    amount,
    reference,
  });

  const status = response?.data?.meta.status;

  if (response?.error || status === StatusEnum.FAILED) {
    await Transaction.create({
      ...txnPayload,
      status: StatusEnum.FAILED,
      responsePayload: response,
    });

    // Return the money we already debited before bailing out
    await refundUser({ user, amount, currency });

    logger.info(response?.error);

    throw new AppError(
      response?.error?.message ||
        response?.data?.message ||
        `Oh Snap! Airtime transaction failed. Try again`,
    );
  }

  await Transaction.create({
    ...txnPayload,
    settlement: (checkService.rate / 100) * amount,
    status,
    responsePayload: response,
    finalBalance: balance,
  });

  sendResponse(res, 200, `Airtime transaction ${statusMessage(status!)}`, {
    phone,
    amount,
    network: checkService.entityName,
    reference,
  });
});

export const buyAirtime = async (option: {
  checkService: { name: string; slug: string };
  phone: string;
  amount: number;
  reference: string;
}) => {
  const { checkService, phone, amount, reference } = option;

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.VTPASS.toLowerCase()) {
    response = await vtpassPay({
      serviceID: checkService.slug,
      phone,
      amount,
      request_id: reference,
    });
  }

  return response;
};
