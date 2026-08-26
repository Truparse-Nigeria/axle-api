import {
  ActivityEnum,
  AppError,
  cardServiceCheck,
  CardStatusEnum,
  cardWithdrawalProperties,
  FiatCurrencyEnum,
  generateRequestID,
  pinCheck,
  PurposeEnum,
  sendResponse,
  StatusEnum,
  terminateCardSchema,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card, Transaction } from "@/model";
import { eversendGetCard, eversendTerminateCard } from "@/provider";

export const terminateCard = catchAsync(async (req, res) => {
  const { cardId, pin } = await validateRequestPayload(
    req.body,
    terminateCardSchema,
  );

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // Validate the user's pin (also enforces the wrong-PIN lockout)
  await pinCheck(pin, user?.pin, String(user._id));

  // Mask the pin so it is never persisted on the transaction's requestPayload
  req.body.pin = req.body.pin?.replace(/./g, "*");

  // Card must exist, belong to the user, and not already be terminated.
  // `provider` is `select: false`, so it must be explicitly selected.
  const card = await Card.findOne({
    _id: cardId,
    user: user._id,
    status: { $ne: CardStatusEnum.TERMINATED },
  }).select("+provider");

  if (!card) {
    throw new AppError("Oops, This card does not exist");
  }

  const { currency, cardBrand, variant, provider, cardName, lastFour } = card;

  // Terminating settles the card's remaining balance back to the user, so the
  // withdrawal service/rate config governs the payout.
  const checkService = await cardServiceCheck(
    currency,
    cardBrand,
    "withdraw",
    variant,
  );

  if (!checkService) throw new AppError("Service not available");

  // Fetch the live card from the provider so we settle the true remaining
  // balance, not a possibly-stale local value.
  let remainingBalance = 0;
  if (provider === VendorEnum.EVERSEND) {
    const liveCard = await eversendGetCard(card.externalCardId);

    if (liveCard?.error || !liveCard?.data) {
      throw new AppError("Unable to retrieve card. Try again!");
    }

    // Eversend returns the remaining balance on `amount`.
    remainingBalance = Number(liveCard.data.amount) || 0;
  }

  // Convert the remaining balance to NGN at the withdrawal rate.
  const { rate, convertedAmount, baseAmount } = cardWithdrawalProperties(
    remainingBalance,
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
    description: TxnDesc.dollarCardTermination,
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
      amount: remainingBalance,
      totalInNaira: convertedAmount,
    },
    meta: {
      ...req.meta,
      cardId: card._id,
      card: {
        initialBalance: remainingBalance,
        finalBalance: 0,
      },
    },
  };

  // Terminate on the provider first — if this fails, nothing is credited.
  let response = null;
  if (provider === VendorEnum.EVERSEND) {
    response = await eversendTerminateCard({ cardId: card.externalCardId });
  }

  if (response?.error || !response?.data) {
    await Transaction.create({
      ...txnPayload,
      status: StatusEnum.FAILED,
      responsePayload: response ?? {},
    });

    throw new AppError("Oh Snap! Card termination failed. Try again!");
  }

  // Mark the card terminated locally and zero its balance — the remaining
  // funds are being settled back to the user (via the webhook).
  const updatedCard = await Card.findByIdAndUpdate(
    card._id,
    { $set: { status: CardStatusEnum.TERMINATED, balance: 0 } },
    { new: true },
  );

  if (!updatedCard) {
    throw new AppError("Card termination failed. Try again!");
  }

  // Settlement is deferred to the provider's termination webhook — the user is
  // NOT credited here. The transaction stays PROCESSING, and the computed
  // payout is stashed on `meta` (`settlement` + `convertedAmount`) so the
  // webhook can credit the NGN wallet and finalize the transaction.
  await Transaction.create({
    ...txnPayload,
    status: StatusEnum.PROCESSING,
    responsePayload: response.meta ?? response.data,
    meta: {
      ...txnPayload.meta,
      settlement: baseAmount - convertedAmount,
      convertedAmount,
      // Card balance before termination, in the card's own currency.
      amount: remainingBalance,
    },
  });

  return sendResponse(res, 200, "Card termination is processing", {
    ...txnPayload.view,
    status: StatusEnum.PROCESSING,
  });
});
