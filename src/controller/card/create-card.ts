import {
  ActivityEnum,
  AppError,
  CardBrandEnum,
  cardCreationProperties,
  cardServiceCheck,
  CardTypeEnum,
  cardVendorByVariant,
  chargeUser,
  createCardSchema,
  DEFAULT_CARD_ADDRESS,
  ENVIRONMENT,
  FiatCurrencyEnum,
  generateRequestID,
  IS_DEVELOPMENT,
  logger,
  ngnCardServiceCheck,
  NgnCardVariantEnum,
  PurposeEnum,
  refundUser,
  runCheck,
  safeDecryptData,
  sendResponse,
  StatusEnum,
  testIdentity,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  type IEversendCardUserPayload,
  type ISudoCreateCustomerReq,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card, Transaction, User } from "@/model";
import {
  eversendCardUser,
  eversendCreateCard,
  sudoCreateCard,
  sudoCreateCustomer,
} from "@/provider";
import type { Request, Response } from "express";

export const createCard = catchAsync(async (req, res) => {
  // Validate request payload
  const payload = await validateRequestPayload(req.body, createCardSchema);

  // Naira cards are issued by Sudo and follow their own flow
  if (payload.currency === FiatCurrencyEnum.NGN) {
    return createNgnCard(req, res, payload);
  }

  const { amount, pin, currency, cardBrand, name, variant } = payload;

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
      idType: "Passport",
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
    currency,
    user: user._id,
    customName: name,
    variant,
  }).catch((e) => {
    logger.error(`Card creation was not saved: ${e.message}`);
  });

  // Mask sensitive card details before persisting them in the transaction payload.
  // Each character of securityCode, expiration and number is replaced with "*"
  // (e.g. securityCode "636" becomes "***").
  const mask = (value: unknown) =>
    value == null ? value : "*".repeat(String(value).length);

  const responseMeta = response.meta as any;
  const maskedMeta = responseMeta?.card
    ? {
        ...responseMeta,
        card: {
          ...responseMeta.card,
          securityCode: mask(responseMeta.card.securityCode),
          expiration: mask(responseMeta.card.expiration),
          number: mask(responseMeta.card.number),
        },
      }
    : responseMeta;

  // Create transaction
  await Transaction.create({
    ...txnPayload,
    status: StatusEnum.SUCCESS,
    settlement: convertedAmount - baseAmount,
    responsePayload: maskedMeta,
    finalBalance: balance,
    view: {
      ...txnPayload.view,
      cardBrand: card?.cardBrand,
      cardName: card?.cardName,
      lastFourDigit: card?.lastFour,
    },
    meta: {
      ...txnPayload.meta,
      cardId: card?._id,
    },
  }).catch((e) => {
    logger.error(`Card creation transaction was not saved: ${e.message}`);
  });

  // Flag that this user now has a card
  if (!user?.hasCard) {
    await User.findByIdAndUpdate(user._id, { $set: { hasCard: true } });
  }

  return sendResponse(res, 200, "Card creation successful", txnPayload.view);
});

// Naira card creation (Sudo). The user pays `creationFee` from their NGN
// wallet; our settlement is `creationFee - providerCreationFee`.
export const createNgnCard = async (
  req: Request,
  res: Response,
  payload: {
    pin: string;
    cardBrand: CardBrandEnum;
    name: string;
    variant: NgnCardVariantEnum;
  },
) => {
  const { pin, cardBrand, name, variant } = payload;
  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // Sudo needs the card's PAN up front for physical cards, which we don't hold
  if (variant === NgnCardVariantEnum.PHYSICAL) {
    throw new AppError("Physical card creation is not available yet");
  }

  const currency = FiatCurrencyEnum.NGN;

  const checkService = await ngnCardServiceCheck(cardBrand, "create");

  if (!checkService) throw new AppError("Service not available");

  const { creationFee, providerCreationFee } = checkService;

  if (providerCreationFee > creationFee) {
    throw new AppError(
      "Oops! Card creation didn't go as planned. Let's try that again",
      503,
    );
  }

  // Validate pin and NGN wallet balance before any external/provider calls
  await runCheck({ user, amount: creationFee, currency, pin });
  delete req.body.pin;

  // Sudo cards belong to a Sudo customer, provisioned once per user from KYC
  if (!user.identifier?.sudo) {
    const bvn = user.kyc?.bvn?.details;
    const address = user.kyc?.address?.details;

    if (!bvn?.dateOfBirth) {
      throw new AppError("Complete your BVN KYC to create a Naira card");
    }

    if (!address?.line1) {
      throw new AppError("Complete your Address KYC to create a Naira card");
    }

    const customerPayload: ISudoCreateCustomerReq = {
      type: "individual",
      name: `${bvn.firstName} ${bvn.lastName}`,
      phoneNumber: `${user.dialCode}${user.phone}`,
      status: "active",
      emailAddress: user.email,
      billingAddress: {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      individual: {
        firstName: user.firstName,
        lastName: user.lastName,
        otherNames: user.middleName,
        dob: safeDecryptData(bvn.dateOfBirth),
        identity: {
          type: "BVN",
          number: IS_DEVELOPMENT ? testIdentity() : safeDecryptData(user.kyc?.bvn?.identifier!),
        },
      },
    };

    const customer = await sudoCreateCustomer(customerPayload);

    if (customer.error || !customer.data) {
      throw new AppError("Unable to set up your NGN card profile. Try again");
    }

    await User.findByIdAndUpdate(user._id, {
      $set: { "identifier.sudo": customer.data._id },
    });

    user.identifier = { ...(user.identifier ?? {}), sudo: customer.data._id };
  }

  // Charge the user's NGN wallet
  const updatedUser = await chargeUser({
    user,
    amount: creationFee,
    currency,
  });

  const balance = updatedUser.wallet.fiat[currency]?.balance || 0;

  const reference = generateRequestID();

  const txnPayload: ITransactionPayload = {
    user: user._id as unknown as string,
    reference,
    amount: creationFee,
    activity: ActivityEnum.DEBIT,
    sourceCurrency: currency,
    destinationCurrency: currency,
    exchangeRate: 1,
    description: TxnDesc.nairaCardCreation,
    provider: VendorEnum.SUDO,
    purpose: PurposeEnum.CARDS,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + creationFee,
    finalBalance: balance + creationFee,
    view: {
      reference,
      currency,
      cardBrand,
      name,
      variant,
      creationFee,
      totalInNaira: creationFee,
    },
    meta: { ...req.meta },
  };

  const response = await sudoCreateCard(
    {
      customerId: user.identifier!.sudo!,
      type: variant,
      currency,
      status: "active",
      brand: cardBrand as "Verve" | "AfriGo",
      issuerCountry: "NGA",
      debitAccountId: ENVIRONMENT.SUDO.DEBIT_ACCOUNT_ID,
      fundingSourceId: ENVIRONMENT.SUDO.FUNDING_SOURCE_ID,
    },
    name,
  );

  // If card creation failed, record a failed txn, refund the charge, and bail
  if (response.error || !response.data) {
    await Transaction.create({
      ...txnPayload,
      status: StatusEnum.FAILED,
      responsePayload: response.error ?? {},
      finalBalance: balance,
    });

    await refundUser({ user, amount: creationFee, currency });

    throw new AppError("Oh Snap! Card creation failed. Try again!");
  }

  const card = await Card.create({
    ...response.data,
    currency,
    user: user._id,
    customName: name,
    cardType: CardTypeEnum.VIRTUAL,
    provider: VendorEnum.SUDO,
  });

  if (!card) {
    throw new AppError("Unable to complete card creation")
  }

  await Transaction.create({
    ...txnPayload,
    status: StatusEnum.SUCCESS,
    settlement: creationFee - providerCreationFee,
    responsePayload: response.meta,
    finalBalance: balance,
    view: {
      ...txnPayload.view,
      cardBrand: card?.cardBrand,
      cardName: card?.cardName,
      lastFourDigit: card?.lastFour,
    },
    meta: {
      ...txnPayload.meta,
      cardId: card?._id,
    },
  }).catch((e) => {
    logger.error(`Card creation transaction was not saved: ${e.message}`);
  });

  if (!user?.hasCard) {
    await User.findByIdAndUpdate(user._id, { $set: { hasCard: true } });
  }

  return sendResponse(res, 200, "Card creation successful", txnPayload.view);
};
