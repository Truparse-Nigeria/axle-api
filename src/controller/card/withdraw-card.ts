import {
  ActivityEnum,
  AppError,
  cardBalanceUpdate,
  cardServiceCheck,
  CardStatusEnum,
  cardWithdrawalProperties,
  FiatCurrencyEnum,
  generateRequestID,
  logger,
  pinCheck,
  PurposeEnum,
  refundUser,
  sendResponse,
  StatusEnum,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  withdrawCardSchema,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card, Transaction } from "@/model";
import { eversendWithdrawCard } from "@/provider";

export const withdrawCard = catchAsync(async (req, res) => {
  const { amount, pin, cardId } = await validateRequestPayload(
    req.body,
    withdrawCardSchema,
  );

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // Validate the user's pin
  await pinCheck(pin, user?.pin, String(user._id));

  // Mask the pin so it is never persisted on the transaction's requestPayload
  req.body.pin = req.body.pin?.replace(/./g, "*");

  // Card must exist, belong to the user, and not be terminated
  const cardExist = await Card.findOne({
    _id: cardId,
    user: user._id,
    status: { $ne: CardStatusEnum.TERMINATED },
  }).select("+provider");

  if (!cardExist) {
    throw new AppError("Oops, This card does not exist");
  }

  const { currency, cardBrand, variant, provider, cardName, lastFour } =
    cardExist;

  // Cannot withdraw more than the card holds
  if (amount > cardExist.balance) {
    throw new AppError("Insufficient card balance");
  }

  // Confirm withdrawal is available for this card's variant/brand/currency
  const checkService = await cardServiceCheck(
    currency,
    cardBrand,
    "withdraw",
    variant,
  );

  if (!checkService) throw new AppError("Service not available");

  // Performs all calculations and conversions
  const { rate, convertedAmount, baseAmount } = cardWithdrawalProperties(
    amount,
    checkService,
  );

  // Proceeds are credited to the user's NGN wallet
  const payoutCurrency = FiatCurrencyEnum.NGN;
  const currentBalance = user.wallet.fiat[payoutCurrency]?.balance || 0;

  const reference = generateRequestID();

  const txnPayload: ITransactionPayload = {
    user: user._id as unknown as string,
    reference,
    amount: convertedAmount,
    activity: ActivityEnum.CREDIT,
    sourceCurrency: currency,
    destinationCurrency: payoutCurrency,
    exchangeRate: rate,
    description: TxnDesc.dollarCardWithdrawal,
    provider,
    purpose: PurposeEnum.CARDS,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: currentBalance,
    finalBalance: currentBalance,
    view: {
      reference,
      cardName,
      lastFourDigit: lastFour,
      rate,
      amount,
      totalInNaira: convertedAmount,
    },
    meta: {
      ...req.meta,
      cardId: cardExist._id,
      card: {
        initialBalance: cardExist.balance,
        finalBalance: cardExist.balance,
      },
    },
  };

  let response = null;

  // Withdraw from the card based on its provider
  if (provider === VendorEnum.EVERSEND) {
    response = await eversendWithdrawCard({
      cardId: cardExist.externalCardId,
      amount: String(amount),
      currency,
    });
  }

  // If withdrawal failed, record a failed txn and bail (nothing was charged)
  if (response?.error || !response?.data) {
    await Transaction.create({
      ...txnPayload,
      status: StatusEnum.FAILED,
      responsePayload: response ?? {},
    });

    // Map known provider errors to friendlier, actionable messages
    const errorText =
      response?.error?.errorData?.message || response?.error?.message || "";

    const errorMap: { check: string; message: string }[] = [
      {
        check: "Rate limit exceeded",
        message: "Slow Down! Try again in 3 minutes",
      },
      {
        check: "Insufficient funds in the card",
        message:
          "Insufficient remaining balance. A minimum balance must stay on the card.",
      },
    ];

    const errorMessage =
      errorMap.find((e) => errorText.includes(e.check))?.message ||
      "Oh Snap! Card withdrawal failed. Try again!";

    throw new AppError(errorMessage);
  }

  // Sync the card balance to the provider-reported value
  const updatedCard = await cardBalanceUpdate(
    cardId,
    user,
    response.data.balance,
    { purpose: "withdrawal" },
  );

  if (!updatedCard) {
    throw new AppError("Card withdrawal failed. Try again!");
  }

  // Credit the withdrawn proceeds to the user's NGN wallet
  const creditedUser = await refundUser({
    user,
    amount: convertedAmount,
    currency: payoutCurrency,
  }).catch(() => {
    logger.error(`Card withdrawal was not credited to user: ${reference}`);
  });

  const walletBalance = creditedUser?.wallet?.fiat?.[payoutCurrency]?.balance;

  await Transaction.create({
    ...txnPayload,
    status: StatusEnum.SUCCESS,
    settlement: baseAmount - convertedAmount,
    responsePayload: response.meta,
    initialBalance:
      (walletBalance ?? txnPayload.initialBalance) - convertedAmount,
    finalBalance: walletBalance ?? txnPayload.finalBalance,
    meta: {
      ...txnPayload.meta,
      card: {
        initialBalance: updatedCard.balance + amount,
        finalBalance: updatedCard.balance,
      },
    },
  });

  return sendResponse(res, 200, "Card withdrawal successful", txnPayload.view);
});
