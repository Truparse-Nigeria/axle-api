import {
  ActivityEnum,
  AppError,
  cacheKey,
  retrieveSettings,
  sendResponse,
  StatusEnum,
  TxnDesc,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction, User } from "@/model";

// `pending`: commission still to be earned from referrals that haven't hit
// minSpend yet. `lifetimeEarned`: total reward already withdrawn to the wallet.
export const getReferralEarnings = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found");

  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);
  const commission = Math.abs(settings?.referAndEarn?.commission ?? 0);

  const [pendingCount, withdrawn] = await Promise.all([
    // Blocked referrals never pay out, so they aren't pending
    User.countDocuments({
      "referredBy.user": user._id,
      "referredBy.completed": { $ne: true },
    }),
    Transaction.aggregate<{ total: number }>([
      {
        $match: {
          user: user._id,
          description: TxnDesc.rewardTransfer,
          activity: ActivityEnum.CREDIT,
          status: StatusEnum.SUCCESS,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return sendResponse(res, 200, "Referral earnings retrieved successfully", {
    pending: pendingCount * commission,
    lifetimeEarned: withdrawn[0]?.total ?? 0,
  });
});
