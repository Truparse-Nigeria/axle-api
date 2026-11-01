import {
  ActivityEnum,
  cacheKey,
  FiatCurrencyEnum,
  generateRequestID,
  PurposeEnum,
  retrieveSettings,
  StatusEnum,
  VendorEnum,
  type IBaseJobType,
} from "@/common";
import { Transaction, User } from "@/model";
import mongoose from "mongoose";

export interface IReferralBonusJob extends IBaseJobType {
  userId: string;
  transactionAmount: number;
}

// Adds the amount a referred user just spent to their running total. The
// update is a single atomic pipeline, so the call that pushes the total past
// `minSpend` is the only one that flips `completed` to true. That call pays
// the referrer's commission into their reward wallet.
export const processReferralBonus = async (data: IReferralBonusJob) => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);
  const referAndEarn = settings?.referAndEarn;
  if (!referAndEarn?.enabled) return;

  const spend = Math.abs(data.transactionAmount ?? 0);
  if (!spend) return;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const referee = await User.findOneAndUpdate(
        {
          _id: data.userId,
          "referredBy.user": { $ne: null },
          "referredBy.completed": { $ne: true },
          "referredBy.blockedReason": null,
        },
        [
          {
            $set: {
              "referredBy.amount": {
                $add: [{ $ifNull: ["$referredBy.amount", 0] }, spend],
              },
            },
          },
          {
            $set: {
              "referredBy.completed": {
                $gte: ["$referredBy.amount", referAndEarn.minSpend],
              },
            },
          },
        ],
        { new: true, session },
      ).select("+referredBy");

      // Not referred, already completed, blocked, or still under minSpend
      if (!referee?.referredBy?.completed) return;

      const commission = Math.abs(referAndEarn.commission);
      if (!commission) return;

      const referrer = await User.findByIdAndUpdate(
        referee.referredBy.user,
        { $inc: { "wallet.reward": commission } },
        { new: true, session },
      );

      if (!referrer) return;

      const currency = FiatCurrencyEnum.NGN;
      const description = "Referral commission earned";

      await Transaction.create(
        [
          {
            user: referrer._id,
            reference: generateRequestID(),
            amount: commission,
            sourceCurrency: currency,
            destinationCurrency: currency,
            exchangeRate: 1,
            description,
            activity: ActivityEnum.CREDIT,
            provider: VendorEnum.AXLE,
            purpose: PurposeEnum.REFER_AND_EARN,
            status: StatusEnum.SUCCESS,
            settlement: 0,
            requestPayload: { referee: referee._id },
            initialBalance: referrer.wallet.reward - commission,
            finalBalance: referrer.wallet.reward,
            view: {
              description,
              amount: commission,
              referee: `${referee.firstName} ${referee.lastName}`,
            },
            meta: { referee: referee._id },
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
};
