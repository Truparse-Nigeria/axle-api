import {
  ActivityEnum,
  AppError,
  cacheKey,
  deleteFields,
  FiatCurrencyEnum,
  generateRequestID,
  pinCheck,
  PurposeEnum,
  retrieveSettings,
  sendResponse,
  SENSITIVE_USER_FIELDS,
  StatusEnum,
  swapCoinsSchema,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction, User } from "@/model";
import mongoose from "mongoose";

// Converts the user's whole axle coins balance into NGN wallet balance at
// `settings.axleCoins.nairaPerCoin`
export const swapCoins = catchAsync(async (req, res) => {
  const { pin } = await validateRequestPayload(req.body, swapCoinsSchema);

  const user = req.user;
  if (!user) throw new AppError("User not found");

  await pinCheck(pin, user.pin, String(user._id));

  const coins = user.wallet?.axleCoins ?? 0;
  if (coins <= 0) throw new AppError("No axle coins to swap");

  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);
  const nairaPerCoin = settings?.axleCoins?.nairaPerCoin;
  if (!nairaPerCoin) throw new AppError("Coin swap is not available right now");

  const amount = Math.round(coins * nairaPerCoin * 100) / 100;
  const currency = FiatCurrencyEnum.NGN;

  const session = await mongoose.startSession();

  try {
    const updatedUser = await session.withTransaction(async () => {
      // Matching on the coins we priced makes a concurrent swap, or a
      // transaction retry, a no-op instead of a second payout
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, "wallet.axleCoins": coins },
        {
          $inc: { [`wallet.fiat.${currency}.balance`]: amount },
          $set: { "wallet.axleCoins": 0 },
        },
        { new: true, session },
      );

      if (!updatedUser) {
        throw new AppError(
          "Coins already swapped or changed. Refresh and try again",
          409,
        );
      }

      const reference = generateRequestID();
      const finalBalance = updatedUser.wallet.fiat[currency].balance;

      await Transaction.create(
        [
          {
            user: user._id,
            reference,
            amount,
            sourceCurrency: currency,
            destinationCurrency: currency,
            exchangeRate: nairaPerCoin,
            description: TxnDesc.axleCoinsSwap,
            activity: ActivityEnum.CREDIT,
            provider: VendorEnum.AXLE,
            purpose: PurposeEnum.WALLET,
            status: StatusEnum.SUCCESS,
            settlement: 0,
            initialBalance: finalBalance - amount,
            finalBalance,
            view: {
              reference,
              description: TxnDesc.axleCoinsSwap,
              coins,
              rate: nairaPerCoin,
              amount,
            },
            meta: { coins, nairaPerCoin },
          },
        ],
        { session, ordered: true },
      );

      return updatedUser;
    });

    return sendResponse(
      res,
      200,
      "Axle coins swapped successfully",
      deleteFields(updatedUser, SENSITIVE_USER_FIELDS),
    );
  } finally {
    await session.endSession();
  }
});
