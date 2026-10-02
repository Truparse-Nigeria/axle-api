import {
  ActivityEnum,
  AppError,
  billServiceCheck,
  buyDataSchema,
  cacheKey,
  chargeUser,
  cheapDataService,
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
  type IDataPlan,
  type IRegularData,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction } from "@/model";
import { blaacDataPurchase, vtpassPay } from "@/provider";
import { cheapDataQuery } from "./cheap-data";
import { regularDataQuery } from "./regular-data-plans";

const { CHEAP_DATA_KEY, REGULAR_DATA_KEY } = cacheKey;

export const purchaseData = catchAsync(async (req, res) => {
  const { network, dataId, isPromo, phone, pin } = await validateRequestPayload(
    req.body,
    buyDataSchema,
  );

  const user = req.user;
  if (!user) {
    throw new AppError("User not found");
  }

  // Regular (VTpass) plan ids are prefixed with REG_, cheap plans are DataPlan ids
  const isRegularData = dataId.startsWith("REG_");

  const bundle = await getBundle(isRegularData, network);

  const plan = bundle.find(
    (data) => String(data._id) === dataId && data.isPromo === isPromo,
  );

  if (!plan) {
    throw new AppError("Seems this plan has changed. Try another plan");
  }

  // Resolve provider, display name and our margin per plan type
  let order: {
    provider: string;
    slug?: string;
    entityName?: string;
    planName: string;
    settlement: number;
  };

  if (isRegularData) {
    const checkService = await billServiceCheck("regularData", network);
    if (!checkService) {
      throw new AppError("Service not available");
    }

    order = {
      provider: checkService.name.toLowerCase(),
      slug: checkService.slug,
      entityName: checkService.entityName,
      planName: plan.name,
      settlement: (checkService.rate / 100) * plan.price,
    };
  } else {
    const cheapPlan = plan as IDataPlan;

    const checkService = await cheapDataService(cheapPlan.network);
    if (!checkService) {
      throw new AppError("Service not available");
    }

    order = {
      provider: cheapPlan.provider,
      entityName: checkService.name,
      planName: `${cheapPlan.size}${cheapPlan.unit} ${cheapPlan.extension ?? ""}`.trim(),
      settlement: cheapPlan.price - cheapPlan.unitPrice,
    };
  }

  // Source and destination currency are both NGN for data, so the
  // exchange rate is always 1.
  const currency = FiatCurrencyEnum.NGN;
  const amount = plan.price;

  await runCheck({ user, amount, currency, pin });
  delete req.body.pin;

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
    description: TxnDesc.dataPurchase,
    provider: order.provider,
    purpose: PurposeEnum.DATA,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + amount,
    finalBalance: balance + amount,
    view: {
      network: order.entityName,
      reference,
      description: TxnDesc.dataPurchase,
      plan: order.planName,
      phone,
      amount,
      total: amount,
    },
    meta: { ...req.meta },
  };

  const response = await payData({
    provider: order.provider,
    slug: order.slug,
    phone,
    planId: String(plan.planId),
    reference,
  });

  const status = response?.data?.meta.status;

  // A null response means no provider was matched — treat as a failure
  // so the user is refunded rather than charged for undelivered data.
  if (!response || response.error || status === StatusEnum.FAILED) {
    await Transaction.create({
      ...txnPayload,
      status: StatusEnum.FAILED,
      responsePayload: response,
    });

    // Return the money we already debited before bailing out
    await refundUser({ user, amount, currency });

    throw new AppError(
      response?.error?.message ||
        response?.data?.message ||
        "Oh Snap! Data transaction failed. Try again",
    );
  }

  await Transaction.create({
    ...txnPayload,
    settlement: order.settlement,
    status,
    responsePayload: response,
    finalBalance: balance,
  });

  sendResponse(
    res,
    200,
    `Data transaction ${statusMessage(status!)}`,
    txnPayload.view,
  );
});

const getBundle = async (
  isRegularData: boolean,
  network: string,
): Promise<(IDataPlan | IRegularData)[]> => {
  if (isRegularData) {
    return (
      (await getCache<IRegularData[]>(`${network}_${REGULAR_DATA_KEY}`)) ||
      (await regularDataQuery(network))
    );
  }

  return (
    (await getCache<IDataPlan[]>(`${CHEAP_DATA_KEY}:FULL`)) ||
    (await cheapDataQuery()).data
  );
};

export const payData = async (option: {
  provider: string;
  slug?: string;
  phone: string;
  planId: string;
  reference: string;
}) => {
  const { provider, slug, phone, planId, reference } = option;

  if (provider === VendorEnum.VTPASS) {
    return await vtpassPay({
      request_id: reference,
      serviceID: slug!,
      billersCode: phone,
      phone,
      variation_code: planId,
    });
  }

  if (provider === VendorEnum.BLAAC) {
    return await blaacDataPurchase({ dataId: planId, mobileNumber: phone });
  }

  return null;
};
