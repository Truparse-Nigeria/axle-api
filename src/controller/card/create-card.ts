import {
  ActivityEnum,
  AppError,
  cardCreationProperties,
  cardServiceCheck,
  cardVendorByVariant,
  chargeUser,
  createCardSchema,
  DEFAULT_CARD_ADDRESS,
  FiatCurrencyEnum,
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
  type IEversendCardUserPayload,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card, Transaction, User } from "@/model";
import { eversendCardUser, eversendCreateCard } from "@/provider";

export const createCard = catchAsync(async (req, res) => {
  // Validate request payload
  const { amount, pin, currency, cardBrand, name, variant } =
    await validateRequestPayload(req.body, createCardSchema);

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // Confirm the card service is available for this variant/brand/currency
  const checkService = await cardServiceCheck(
    currency,
    cardBrand,
    "create",
    variant,
  );

  if (!checkService) throw new AppError("Service not available");

  // Performs all calculations and conversions
  const { rate, convertedAmount, baseAmount } = cardCreationProperties(
    amount,
    checkService,
  );

  // The card is funded in `currency` (e.g. USD), but the user pays for it from
  // their NGN wallet — `convertedAmount` is already in Naira.
  const chargeCurrency = FiatCurrencyEnum.NGN;

  // Validate pin and NGN wallet balance before any external/provider calls
  await runCheck({
    user,
    amount: convertedAmount,
    currency: chargeCurrency,
    pin,
  });
  delete req.body.pin;

  const vendor = cardVendorByVariant(variant);

  /**
   * Eversend cards require the user to first exist as an Eversend "card user".
   * If this user has no `identifier.eversend` yet, provision one now and persist
   * its id to the user before we create the card.
   */
  if (vendor === VendorEnum.EVERSEND && !user.identifier?.eversend) {
    const cardUserPayload: IEversendCardUserPayload = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: `${user.dialCode}${user.phone}`,
      //TODO: Users need to use their own address after KYC is implemented. For now, we use a default address for all users.
      country: DEFAULT_CARD_ADDRESS.country,
      state: DEFAULT_CARD_ADDRESS.state,
      city: DEFAULT_CARD_ADDRESS.city,
      address: DEFAULT_CARD_ADDRESS.address,
      zipCode: DEFAULT_CARD_ADDRESS.zipCode,
      //TODO: KYC not yet collected — placeholder identity details for now
      idType: "PASSPORT",
      idNumber: String(user._id),
    };

    const cardUser = await eversendCardUser(cardUserPayload);

    if (cardUser.error || !cardUser.data) {
      throw new AppError("Unable to set up your card profile. Try again");
    }

    const eversendUserId = cardUser.data.data.userId;

    await User.findByIdAndUpdate(user._id, {
      $set: { "identifier.eversend": eversendUserId },
    });

    // Reflect the new identifier on the in-memory user for the rest of the flow
    user.identifier = { ...(user.identifier ?? {}), eversend: eversendUserId };
  }

  // Charge the user's NGN wallet
  const updatedUser = await chargeUser({
    user,
    amount: convertedAmount,
    currency: chargeCurrency,
  });

  const balance = updatedUser.wallet.fiat[chargeCurrency]?.balance || 0;

  const reference = generateRequestID();

  // Txn default object
  const txnPayload: ITransactionPayload = {
    user: user._id as unknown as string,
    reference,
    amount: convertedAmount,
    activity: ActivityEnum.DEBIT,
    sourceCurrency: chargeCurrency,
    destinationCurrency: currency,
    exchangeRate: rate,
    description: TxnDesc.dollarCardCreation,
    provider: vendor,
    purpose: PurposeEnum.CARDS,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + convertedAmount,
    finalBalance: balance + convertedAmount,
    view: {
      reference,
      rate,
      creationFee: checkService.creationFee,
      currency,
      cardBrand,
      name,
      amount,
      creationFeeInNaira: checkService.creationFee * rate,
      amountInNaira: amount * rate,
      totalInNaira: convertedAmount,
    },
    meta: { ...req.meta },
  };

  let response = null;

  // Create card based on provider
  if (vendor === VendorEnum.EVERSEND) {
    response = await eversendCreateCard({
      title: name,
      amount: String(amount),
      userId: user.identifier!.eversend!,
      currency,
      brand: cardBrand.toLowerCase(),
      isNonSubscription: true,
    });
  }

  // If card creation failed, record a failed txn, refund the charge, and bail
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

    throw new AppError("Oh Snap! Card creation failed. Try again!");
  }

  // Persist the card. `cardBrand`/`currency` are set from our validated enums to
  // avoid provider casing mismatches against the schema enums.
  const card = await Card.create({
    ...response.data,
    cardBrand,
    currency,
    user: user._id,
    customName: name,
    variant,
  }).catch((e) => {
    logger.error(`Card creation was not saved: ${e.message}`);
  });

  // Create transaction
  await Transaction.create({
    ...txnPayload,
    status: StatusEnum.SUCCESS,
    settlement: convertedAmount - baseAmount,
    responsePayload: response.meta,
    finalBalance: balance,
    view: {
      ...txnPayload.view,
      cardName: card?.cardName,
      lastFourDigit: card?.lastFour,
    },
    "meta.cardId": card?._id,
  }).catch((e) => {
    logger.error(`Card creation transaction was not saved: ${e.message}`);
  });

  // Flag that this user now has a card
  if (!user?.hasCard) {
    await User.findByIdAndUpdate(user._id, { $set: { hasCard: true } });
  }

  return sendResponse(res, 200, "Card creation successful", txnPayload.view);
});
