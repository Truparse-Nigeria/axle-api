import {
  ActivityEnum,
  AppError,
  chargeUser,
  esimPurchaseSchema,
  esimServiceCheck,
  generateRequestID,
  GloesimPackageTypeEnum,
  logger,
  PurposeEnum,
  refundUser,
  runCheck,
  sendResponse,
  StatusEnum,
  statusMessage,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  type IGloesimPurchaseDataOnly,
  type IGloesimPurchaseDataVoiceSms,
  type ITransactionPayload,
  type TAllowance,
  type TEsimPurchaseInput,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction } from "@/model";
import { gloesimPackageDetail, gloesimPurchase } from "@/provider";

// The transaction `view` only holds scalar (string | number) values, so render
// a data/voice/sms allowance as a display string.
const allowanceText = (allowance: TAllowance): string => {
  if (allowance.kind === "unlimited") return "Unlimited";
  if (allowance.kind === "none") return "None";
  return allowance.unit
    ? `${allowance.value} ${allowance.unit}`
    : `${allowance.value}`;
};

export const purchaseEsim = catchAsync(async (req, res) => {
  // Validate the body. The schema is a discriminated union on `packageType`, so
  // it enforces the right required fields for a data-only vs data-voice-sms
  // purchase and carries the currency (default NGN) and pin.
  const payload = await validateRequestPayload(req.body, esimPurchaseSchema);
  const { packageType, packageId, currency, pin } = payload;

  // validate use from req.user
  const user = req.user;
  if (!user) {
    throw new AppError("User not found");
  }

  // Confirms eSIM is enabled and resolves the enabled provider's pricing
  // (markup % + Naira-per-USD rate).
  const checkService = await esimServiceCheck();
  if (!checkService) {
    throw new AppError("Service not available");
  }

  // fetch the package details based on the provider condition. This prices the
  // package (marks up the USD and converts to Naira) so we know what to charge.
  let detail = null;
  if (checkService.slug === VendorEnum.GLOESIM) {
    detail = await gloesimPackageDetail(packageId, {
      markup: checkService.markup,
      rate: checkService.rate,
    });
  }

  if (detail?.error || !detail?.data?.price) {
    throw new AppError("Unable to retrieve package details", 404);
  }

  // check that the package type matches the payload package type, so a caller
  // can't send a data-only payload against a data-voice-sms package (or vice
  // versa) and get mispriced/mis-provisioned. Only enforce when the provider
  // actually echoes a package type — some detail responses omit it, and we
  // don't want to reject an otherwise-valid purchase on a missing field.
  if (detail.data.packageType && detail.data.packageType !== packageType) {
    throw new AppError("Package type does not match the selected package", 400);
  }

  // calculate the total amount to charge the user based on the package price,
  // markup and rate — the Naira price already folds all three in.
  const price = detail.data.price;

  const amount = price.ngn.amount;

  // Settlement is our margin in Naira: the marked-up difference over the raw
  // provider (base) USD price, converted at the provider rate. Round to kobo so
  // float noise doesn't leak into the ledger.
  const settlement = Number(
    (amount - price.baseUsd * checkService.rate).toFixed(2),
  );

  // run check (pin + wallet balance) now that we know the amount, then drop the
  // pin so it never lands in the persisted request payload.
  await runCheck({ user, amount, currency, pin });
  delete req.body.pin;

  // Charge user
  const updatedUser = await chargeUser({ user, amount, currency });

  const balance = updatedUser.wallet.fiat[currency]?.balance || 0;

  const reference = generateRequestID();

  // make the base txn payload
  const txnPayload: ITransactionPayload = {
    user: user._id as unknown as string,
    reference,
    amount,
    activity: ActivityEnum.DEBIT,
    sourceCurrency: currency,
    destinationCurrency: currency,
    exchangeRate: 1,
    description: TxnDesc.esimPurchase,
    provider: checkService.slug,
    purpose: PurposeEnum.ESIM,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + amount,
    finalBalance: balance + amount,
    // Package details flattened to scalars — `view` only stores string | number.
    view: {
      reference,
      description: TxnDesc.esimPurchase,
      packageName: detail.data.rawName,
      packageType,
      network: detail.data.network ?? "",
      data: allowanceText(detail.data.data),
      voice: allowanceText(detail.data.voice),
      sms: allowanceText(detail.data.sms),
      validity: detail.data.validity.display,
      connectivity: detail.data.connectivity.join(", "),
      activation: detail.data.activation?.description ?? "",
      priceUsd: detail.data.price.usd.display,
      priceNgn: detail.data.price.ngn.amount,
      total: amount,
      currency,
    },
    meta: { ...req.meta },
  };

  // call purchase with the payload based on provider and package type
  const response = await buyEsim({ checkService, packageId, payload });

  if (response?.error || !response?.data) {
    await Transaction.create({
      ...txnPayload,
      status: StatusEnum.FAILED,
      responsePayload: response,
    });

    // Return the money we already debited before bailing out
    await refundUser({ user, amount, currency });

    logger.info(response?.error);

    throw new AppError(
      response?.error?.message || `Oh Snap! eSIM transaction failed. Try again`,
    );
  }

  const purchase = response.data;

  // Surface the install details (QR/SM-DP+/install links) on the view as
  // scalars — the buyer needs them to install the eSIM — and keep the sim id in
  // meta so the eSIM can be re-queried later.
  txnPayload.view.esimStatus = purchase.status;
  txnPayload.view.iccid = purchase.esim.iccid;
  txnPayload.view.qrCodeText = purchase.esim.qrCodeText;
  txnPayload.view.smdpAddress = purchase.esim.smdpAddress;
  txnPayload.view.matchingId = purchase.esim.matchingId;
  txnPayload.view.iosInstallUrl = purchase.esim.iosInstallUrl;
  txnPayload.view.androidInstallUrl = purchase.esim.androidInstallUrl;
  txnPayload.view.redeemLink = purchase.esim.redeemLink;
  txnPayload.view.esimNumber = purchase.esim.number ?? "";
  txnPayload.meta = {
    ...txnPayload.meta,
    ...purchase.esim,
    simId: response.meta?.data?.sim_id ?? purchase.id,
  };

  await Transaction.create({
    ...txnPayload,
    settlement,
    status: StatusEnum.SUCCESS,
    responsePayload: response.meta,
    finalBalance: balance,
  });

  return sendResponse(
    res,
    200,
    `eSIM transaction ${statusMessage(StatusEnum.SUCCESS)}`,
    txnPayload.view,
  );
});

// Dispatches the purchase to the enabled provider, building the provider payload
// from the validated request. `package_type_id` is the provider package id.
const buyEsim = async (option: {
  checkService: { slug: string };
  packageId: string;
  payload: TEsimPurchaseInput;
}) => {
  const { checkService, packageId, payload } = option;

  if (checkService.slug === VendorEnum.GLOESIM) {
    if (payload.packageType === GloesimPackageTypeEnum.DATA_ONLY) {
      const providerPayload: IGloesimPurchaseDataOnly = {
        package_type_id: packageId,
        iccid: payload.iccid ?? "",
      };
      return gloesimPurchase(providerPayload);
    }

    const providerPayload: IGloesimPurchaseDataVoiceSms = {
      package_type_id: packageId,
      imei: payload.imei ?? "",
    };
    return gloesimPurchase(providerPayload);
  }

  return null;
};
