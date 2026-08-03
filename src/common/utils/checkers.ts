import type { ClientSession } from "mongoose";
import { User, type IUserDocument } from "@/model";
import { FiatCurrencyEnum } from "../enum";
import { cacheKey } from "../constant";
import type { IBiller, IDisco, ISettings, IUser } from "../interface";
import AppError from "./app-error";
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

// Run all checks before proceeding with a transaction
export const runCheck = async (options: {
  user: IUser;
  amount: number;
  passcode: string;
  currency: FiatCurrencyEnum;
}) => {
  const { user, amount, currency, passcode } = options;

  const wallet = user.wallet.fiat[currency];

  if (!wallet) {
    throw new AppError(`You need to create a wallet for ${currency}`);
  }

  await passcodeCheck(passcode, user?.passcode);
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
