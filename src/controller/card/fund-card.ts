import {
  ActivityEnum,
  AppError,
  cardBalanceUpdate,
  cardFundingProperties,
  cardServiceCheck,
  CardStatusEnum,
  chargeUser,
  FiatCurrencyEnum,
  fundCardSchema,
  generateRequestID,
  logger,
  PurposeEnum,
  refundUser,
  runCheck,
  sendResponse,
  StatusEnum,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card, Transaction, User } from "@/model";
import { eversendFundCard } from "@/provider";

export const fundCard = catchAsync(async (req, res) => {
  const { amount, pin, cardId } = await validateRequestPayload(
    req.body,
    fundCardSchema,
  );

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // Card must exist, belong to the user, and not be terminated
  const cardExist = await Card.findOne({
    _id: cardId,
    user: user._id,
    status: { $ne: CardStatusEnum.TERMINATED },
  }).select("+provider");

  if (!cardExist) {
    throw new AppError("Oops, This card does not exist");
  }

  const { currency, cardBrand, variant, provider } = cardExist;

  // Confirm funding is available for this card's variant/brand/currency
  const checkService = await cardServiceCheck(
    currency,
    cardBrand,
    "fund",
    variant,
  );

  if (!checkService) throw new AppError("Service not available");

  // Performs all calculations and conversions
  const { rate, convertedAmount, baseAmount, fundingFee } =
    cardFundingProperties(amount, checkService);

  if (checkService.minFund > amount) {
    throw new AppError(
      `Your minimum funding amount should be ${checkService.minFund} ${checkService.currency}`,
    );
  }

  if (amount > checkService.maxDepositPerTime) {
    throw new AppError(
      `Your max deposit per time is ${checkService.maxDepositPerTime} ${checkService.currency}`,
    );
  }

  // The card is funded in `currency` (e.g. USD), but the user pays from their
  // NGN wallet — `convertedAmount` is already in Naira.
  const chargeCurrency = FiatCurrencyEnum.NGN;

  // Validate pin and NGN wallet balance before any external/provider calls
  await runCheck({ user, amount: convertedAmount, currency: chargeCurrency, pin });
  delete req.body.pin;

  // Charge the user's NGN wallet
  const updatedUser = await chargeUser({
    user,
    amount: convertedAmount,
    currency: chargeCurrency,
  });

  const balance = updatedUser.wallet.fiat[chargeCurrency]?.balance || 0;

  const reference = generateRequestID();

  const txnPayload: ITransactionPayload = {
    user: user._id as unknown as string,
    reference,
    amount: convertedAmount,
    activity: ActivityEnum.DEBIT,
    sourceCurrency: chargeCurrency,
    destinationCurrency: currency,
    exchangeRate: rate,
    description: TxnDesc.dollarCardFunding,
    provider,
    purpose: PurposeEnum.CARDS,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + convertedAmount,
    finalBalance: balance + convertedAmount,
    view: {
      reference,
      rate,
      cardName: cardExist.cardName,
      lastFourDigit: cardExist.lastFour,
      amount,
      amountInNaira: amount * rate,
      currency: checkService.currency,
      fundingFee,
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

  // Fund the card based on its provider
  if (provider === VendorEnum.EVERSEND) {
    response = await eversendFundCard({
      cardId: cardExist.externalCardId,
      amount: String(amount),
      currency,
    });
  }

  // If funding failed, record a failed txn, refund the charge, and bail
  if (response?.error || !response?.data) {
    await Transaction.create({
      ...txnPayload,
      status: StatusEnum.FAILED,
      responsePayload: response ?? {},
      finalBalance: balance,
    });

    await refundUser({
      user,
      amount: convertedAmount,
      currency: chargeCurrency,
    });

    throw new AppError("Oh Snap! Card funding failed. Try again!");
  }

  // Sync the card balance to the provider-reported value
  const updatedCard = await cardBalanceUpdate(
    cardId,
    user,
    response.data.balance,
    { purpose: "funding" },
  );

  if (!updatedCard) {
    logger.error(`Card funding balance was not updated: ${reference}`);
  }

  await Transaction.create({
    ...txnPayload,
    status: StatusEnum.SUCCESS,
    settlement: convertedAmount - baseAmount,
    responsePayload: response.meta,
    finalBalance: balance,
    meta: {
      ...txnPayload.meta,
      card: updatedCard
        ? {
            initialBalance: cardExist.balance,
            finalBalance: updatedCard.balance,
          }
        : txnPayload.meta.card,
    },
  }).catch((e) => {
    logger.error(`Card funding transaction was not saved: ${e.message}`);
  });

  if (!user?.hasCard) {
    await User.findByIdAndUpdate(user._id, { $set: { hasCard: true } });
  }

  return sendResponse(res, 200, "Card funding successful", {
    ...txnPayload.view,
    lastFour: cardExist.lastFour,
    cardName: cardExist.cardName,
  });
});
