import {
  ActivityEnum,
  AppError,
  cardBalanceUpdate,
  cardServiceCheck,
  CardStatusEnum,
  cardWithdrawalProperties,
  FiatCurrencyEnum,
  generateRequestID,
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
  delete req.body.pin;

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

    throw new AppError("Oh Snap! Card withdrawal failed. Try again!");
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
  });

  const newBalance =
    creditedUser.wallet.fiat[payoutCurrency]?.balance ??
    currentBalance + convertedAmount;

  await Transaction.create({
    ...txnPayload,
    status: StatusEnum.SUCCESS,
    settlement: baseAmount - convertedAmount,
    responsePayload: response.meta,
    initialBalance: currentBalance,
    finalBalance: newBalance,
    meta: {
      ...txnPayload.meta,
      card: {
        initialBalance: cardExist.balance,
        finalBalance: updatedCard.balance,
      },
    },
  });

  return sendResponse(res, 200, "Card withdrawal successful", txnPayload.view);
});
