import {
  ActivityEnum,
  AppError,
  chargeUser,
  FiatCurrencyEnum,
  generateRequestID,
  giftcardOrderSchema,
  giftcardServiceCheck,
  PurposeEnum,
  refundUser,
  runCheck,
  sendResponse,
  StatusEnum,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  type IReloadlyCachedProduct,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction } from "@/model";
import { orderReloadlyGiftcard, reloadlyProductById } from "@/provider";

export const orderGiftcard = catchAsync(async (req, res) => {
  const checkService = await giftcardServiceCheck();

  if (!checkService) {
    throw new AppError("Service not available");
  }

  const { productId, quantity, unitPrice, passcode } =
    await validateRequestPayload(req.body, giftcardOrderSchema);

  const user = req.user;
  if (!user) {
    throw new AppError("User not found");
  }

  // Source and destination currency are both NGN — the user pays for the
  // giftcard from their NGN wallet, so the exchange rate is always 1.
  const currency = FiatCurrencyEnum.NGN;

  const nairaRatePerUSD = checkService.rateMarkup + checkService.rate;

  const getProduct = await reloadlyProductById(productId, nairaRatePerUSD);

  if (getProduct?.error || !getProduct?.data) {
    throw new AppError("Unable to retrieve products", 404);
  }

  const specificProduct = getProduct.data as IReloadlyCachedProduct;

  const currencyCode = specificProduct.recipientCurrencyCode;

  // Sender fee is an array, that must map to the fixedRecipientDenominations
  // Where the matching currencyCode should match unit price passed in
  const senderFeeIndex =
    specificProduct?.fixedRecipientDenominations?.findIndex((item) => {
      // Assert that item is an object with string keys mapping to any value
      const typedItem = item as { [key: string]: number };

      return (
        typedItem &&
        currencyCode &&
        Number(typedItem[currencyCode]) === unitPrice
      );
    });

  const senderFee = specificProduct?.senderFee?.[senderFeeIndex!] || 0;

  // To be used in calculating the amounts
  const NGN =
    specificProduct?.fixedRecipientDenominations?.[senderFeeIndex!]?.NGN || 0;

  const amount = quantity * NGN + senderFee;

  await runCheck({ user, amount, currency, passcode });
  delete req.body.passcode;

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
    description: TxnDesc.buyGiftCard,
    provider: checkService.name.toLowerCase(),
    purpose: PurposeEnum.GIFTCARD,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + amount,
    finalBalance: balance + amount,
    view: {
      reference,
      quantity,
      transactionId: null as number | null,
      giftcardName: specificProduct?.productName,
      unitPrice,
      unitPriceNaira: unitPrice * (checkService.rate + checkService.rateMarkup),
      description: TxnDesc.buyGiftCard,
      countryCode: specificProduct?.country,
      amount,
    },
    meta: { ...req.meta },
  };

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.RELOADLY.toLowerCase()) {
    response = await orderReloadlyGiftcard({
      productId,
      quantity,
      unitPrice,
      senderName: `${user.firstName} ${user.lastName}`,
    });
  }

  if (response?.error || !response?.data) {
    await Transaction.create({
      ...txnPayload,
      status: StatusEnum.FAILED,
      responsePayload: response,
    });

    // Return the money we already debited before bailing out
    await refundUser({ user, amount, currency });

    throw new AppError("Oh Snap! Giftcard transaction failed");
  }

  txnPayload.view.transactionId = response.data.transactionId;

  await Transaction.create({
    ...txnPayload,
    status: StatusEnum.SUCCESS,
    // This will evaluate to NGN + senderFee (both in fixedRecipientDenominations)
    // minus (amount billed in response * rate without markup)
    settlement: amount - response.data.amountBilled * checkService.rate,
    responsePayload: response?.meta,
    finalBalance: balance,
  });

  const data = response.data;
  const responseData = {
    transactionId: data.transactionId,
    currencyCode: specificProduct?.recipientCurrencyCode,
    productName: specificProduct?.productName,
    unitPrice,
    quantity,
  };

  return sendResponse(res, 200, null, responseData);
});
