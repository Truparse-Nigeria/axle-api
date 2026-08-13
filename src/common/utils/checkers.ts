import type { ClientSession } from "mongoose";
import { Card, User, type IUserDocument } from "@/model";
import { CardBrandEnum, CardVariantEnum, FiatCurrencyEnum } from "../enum";
import { cacheKey } from "../constant";
import type {
  IBiller,
  ICardServiceCheck,
  IDisco,
  ISettings,
  IUser,
} from "../interface";
import AppError from "./app-error";
import { deleteCache, getCache, incrCache, setCache } from "./cache";
import { compareHash } from "./helper";
import { retrieveSettings } from "./settings";

export const walletCheck = (balance: number, amount: number) => {
  if (balance < Math.abs(amount)) {
    throw new AppError("Balance too low! Top up to proceed", 400);
  }
};

export const passcodeCheck = async (
  passcode: string,
  userPasscode?: string,
) => {
  if (!userPasscode) {
    throw new AppError("You do not have a passcode. Create one first!", 400);
  }

  const isValid = await compareHash(passcode, userPasscode);

  if (!isValid) {
    throw new AppError(
      "Nope! That is not your current passcode. Try again!",
      400,
    );
  }
};

// Wrong-PIN lockout: after PIN_MAX_ATTEMPTS failures the user is locked out
// for PIN_LOCK_SECONDS. Counters live in the cache, keyed per user.
const PIN_MAX_ATTEMPTS = 10;
const PIN_LOCK_SECONDS = 15 * 60;
const pinLockKey = (userId: string) => `PIN_LOCK:${userId}`;
const pinAttemptKey = (userId: string) => `PIN_WRONG_ATTEMPTS:${userId}`;
const pinLockError = new AppError(
  "Too many wrong PIN attempts. Please try again in 15 minutes.",
  429,
);

export const pinCheck = async (
  pin: string,
  userPin?: string,
  userId?: string,
) => {
  if (!userPin) {
    throw new AppError("You do not have a PIN. Create one first!", 400);
  }

  if (userId) {
    const pinLock = await getCache(pinLockKey(userId));
    if (pinLock) {
      throw pinLockError;
    }
  }

  const isPinValid = await compareHash(pin, userPin);

  if (!isPinValid) {
    if (userId) {
      const attempts = await incrCache(pinAttemptKey(userId), PIN_LOCK_SECONDS);
      if (attempts >= PIN_MAX_ATTEMPTS) {
        await setCache(pinLockKey(userId), true, PIN_LOCK_SECONDS);
        throw pinLockError;
      }
    }
    throw new AppError("Nope! That is not your current PIN. Try again!", 400);
  }

  if (userId) {
    await deleteCache(pinAttemptKey(userId));
  }
};

// Run all checks before proceeding with a transaction
export const runCheck = async (options: {
  user: IUserDocument;
  amount: number;
  pin: string;
  currency: FiatCurrencyEnum;
}) => {
  const { user, amount, currency, pin } = options;

  const wallet = user.wallet.fiat[currency];

  if (!wallet) {
    throw new AppError(`You need to create a wallet for ${currency}`);
  }

  await pinCheck(pin, user?.pin, String(user._id));
  walletCheck(wallet.balance, amount);
};

// Atomically debit the user's fiat wallet for the given currency. The
// `balance >= amount` condition is the source of truth — a null return means
// insufficient funds.
export const chargeUser = async (option: {
  user: IUserDocument;
  amount: number;
  currency: FiatCurrencyEnum;
  session?: ClientSession;
}) => {
  const { user, amount, currency, session } = option;

  const absAmount = Math.abs(amount);
  const balanceField = `wallet.fiat.${currency}.balance`;

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      [balanceField]: { $gte: absAmount },
    },
    {
      $inc: { [balanceField]: -absAmount },
    },
    { new: true, session },
  );

  if (!updatedUser) {
    throw new AppError("Unable to complete transaction. Try again");
  }

  return updatedUser;
};

// Atomically credit the user's fiat wallet (e.g. refund on a failed charge).
export const refundUser = async (option: {
  user: IUserDocument;
  amount: number;
  currency: FiatCurrencyEnum;
  session?: ClientSession;
}) => {
  const { user, amount, currency, session } = option;

  const absAmount = Math.abs(amount);
  const balanceField = `wallet.fiat.${currency}.balance`;

  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    {
      $inc: { [balanceField]: absAmount },
    },
    { new: true, session },
  );

  if (!updatedUser) {
    throw new AppError("Unable to complete transaction. Try again");
  }

  return updatedUser;
};

export const billServiceCheck = async (
  category: keyof Pick<
    ISettings,
    "airtime" | "electricity" | "cable" | "regularData"
  >,
  entity: string,
) => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);

  if (!settings) {
    throw new AppError("Service not available");
  }

  const categorySettings = settings[category];

  /**
   * regular data and airtime have a similar structure, and can share behaviors
   **/
  let operator:
    | (typeof settings.electricity)["discos"]
    | (typeof settings.cable)["networks"]
    | IBiller["networks"]
    | undefined;

  switch (category) {
    case "electricity":
      operator = (categorySettings as typeof settings.electricity)?.discos;
      break;
    case "cable":
      operator = (categorySettings as typeof settings.cable)?.networks;
      break;
    default:
      /**
       * This works for both airtime and regularData
       */
      operator = (categorySettings as IBiller)?.networks;
      break;
  }

  let charge = 0;

  if ("charge" in categorySettings) {
    charge = categorySettings.charge!;
  }

  if (!categorySettings?.enabled || !operator[entity]?.enabled) return null;

  const providers = operator[entity]?.providers;

  if (!providers) return null;

  const enabledProviders = Object.entries(providers).find(
    ([_, provider]) => provider?.enabled,
  );

  if (!enabledProviders) return null;

  return enabledProviders.length
    ? {
        /**
         * enabled providers returns an array of [key, value]
         * we need to return the key as the name of the provider
         * and the value as the rest of the provider object
         * so we use the spread operator for the remaining data
         * to have one object
         */
        name: enabledProviders[0],
        ...(category === "electricity" && {
          code: (operator[entity] as IDisco)?.code,
        }),
        ...enabledProviders[1],
        charge,
        entityName: operator[entity]?.name,
      }
    : null;
};

// Resolves the currently enabled giftcard provider, folding the top-level
// service charge into the returned provider object.
export const giftcardServiceCheck = async () => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);

  if (!settings) {
    throw new AppError("Service not available");
  }

  const giftcardSettings = settings.giftcard;

  const charge = giftcardSettings?.charge || 0;

  const providers = giftcardSettings?.providers;

  if (!providers) return null;

  const enabledProviders = Object.entries(providers).find(
    ([_, provider]) => provider?.enabled,
  );

  if (!enabledProviders) return null;

  return enabledProviders.length
    ? {
        name: enabledProviders[0],
        ...enabledProviders[1],
        charge,
      }
    : null;
};

// Resolve the card settings for a given variant/currency/brand and confirm the
// requested purpose (create/fund/withdraw) is enabled. Returns the merged brand
// properties + custom rates, or null when the service/brand is unavailable.
export const cardServiceCheck = async (
  currency: FiatCurrencyEnum,
  cardBrand: CardBrandEnum,
  purpose: "create" | "fund" | "withdraw",
  variant: CardVariantEnum,
): Promise<ICardServiceCheck | null> => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);

  if (!settings) {
    throw new AppError("Service not available");
  }

  const currencyKey = currency.toLowerCase();
  const brandKey = cardBrand.toLowerCase();

  const cardVariant = settings.cards[variant];
  const brandSettings =
    cardVariant?.currency[currencyKey]?.brandConfig?.[brandKey];

  // Service must be active and the brand must permit this purpose
  if (!cardVariant?.active || !brandSettings?.[purpose]) return null;

  return {
    ...brandSettings,
    rate: cardVariant.customRates,
  };
};

// Set a card's balance to the provider-reported value (absolute, not an
// increment). On funding we also reset the decline counter.
export const cardBalanceUpdate = async (
  cardId: string,
  user: IUserDocument,
  balance: number,
  option?: {
    purpose?: "funding" | "withdrawal";
    session?: ClientSession;
  },
) => {
  const { session, purpose } = option || {};

  return await Card.findOneAndUpdate(
    { _id: cardId, user: user._id },
    {
      $set: {
        balance,
        ...(purpose === "funding" && { declineCount: 0 }),
      },
    },
    { new: true, session },
  );
};

export const cardRateService = async (variant: CardVariantEnum) => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);

  if (!settings) {
    throw new AppError("Service not available");
  }

  return settings?.cards[variant]?.customRates;
};
