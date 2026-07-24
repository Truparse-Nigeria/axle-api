import {
  ActivityEnum,
  AppError,
  billServiceCheck,
  buyCableSchema,
  chargeUser,
  FiatCurrencyEnum,
  generateRequestID,
  getCache,
  PurposeEnum,
  refundUser,
  runCheck,
  sendResponse,
  StatusEnum,
  statusMessage,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  VtpassCableEnum,
  type ICableCombo,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction } from "@/model";
import { vtpassPay } from "@/provider";
import { cablePlansQuery } from "./retrieve-plans";

export const buyCable = catchAsync(async (req, res) => {
  const { planId, smartcardNumber, passcode } = await validateRequestPayload(
    req.body,
    buyCableSchema,
  );

  const entity = planId.split("_")[0]!; // A string is guaranteed to be passed, even if invalid

  let cablePlans = await getCache<ICableCombo[]>(`CABLE_${entity}`);

  if (!cablePlans) {
    cablePlans = (await cablePlansQuery(entity)) || [];
  }

  const getCablePlan = cablePlans.find((plan) => plan._id === planId);

  if (!getCablePlan) {
    throw new AppError("Seems this plan has changed. Try another plan");
  }

  const { amount, name, code } = getCablePlan;

  // Source and destination currency are both NGN for cable, so the
  // exchange rate is always 1.
  const currency = FiatCurrencyEnum.NGN;

  const user = req.user;
  if (!user) {
    throw new AppError("User not found");
  }

  // Check if service is available
  const checkService = await billServiceCheck("cable", entity);
  if (!checkService) {
    throw new AppError("Service not available");
  }

  // Total amount (amount + service charge)
  const totalAmount = amount + checkService.charge;

  await runCheck({ user, amount: totalAmount, currency, passcode });
  delete req.body.passcode;

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
    description: TxnDesc.tvSubscription,
    provider: checkService.name.toLowerCase(),
    purpose: PurposeEnum.CABLE,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + totalAmount,
    finalBalance: balance + totalAmount,
    view: {
      service: checkService.entityName,
      reference,
      description: TxnDesc.tvSubscription,
      smartcardNumber,
      plan: name,
      amount,
      fee: checkService.charge,
      total: totalAmount,
    },
    meta: { ...req.meta },
  };

  const response = await payCable({
    checkService,
    smartcardNumber,
    code,
    amount,
    phone: user.phone,
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
    await refundUser({ user, amount: totalAmount, currency });

    throw new AppError(
      response?.error?.message ||
        response?.data?.message ||
        `Oh Snap! Cable TV transaction ${statusMessage(status!)}`,
    );
  }

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
    `Cable TV transaction ${statusMessage(status!)}`,
    txnPayload.view,
  );
});

export const payCable = async (payload: {
  checkService: { name: string; slug: string };
  smartcardNumber: string;
  code: string;
  amount: number;
  phone: string;
  reference: string;
}) => {
  const { checkService, smartcardNumber, code, amount, phone, reference } =
    payload;

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.VTPASS.toLowerCase()) {
    response = await vtpassPay({
      serviceID: checkService.slug,
      phone,
      amount,
      billersCode: smartcardNumber,
      variation_code: code,
      request_id: reference,
      subscription_type: VtpassCableEnum.CHANGE,
    });
  }

  return response;
};
