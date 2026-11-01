import { cacheKey, retrieveSettings, type IBaseJobType } from "@/common";
import { User } from "@/model";

export interface ITransactionScoreJob extends IBaseJobType {
  userId: string;
}

// Awards opportunity score for a completed transaction: `transaction` to the
// user, and `referralTransaction` to whoever referred them (if anyone).
export const processTransactionScore = async (data: ITransactionScoreJob) => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);
  const referAndEarn = settings?.referAndEarn;
  if (!referAndEarn?.enabled) return;

  const score = Math.abs(referAndEarn.opportunityScore?.transaction ?? 0);
  const referralScore = Math.abs(
    referAndEarn.opportunityScore?.referralTransaction ?? 0,
  );

  const user = await User.findByIdAndUpdate(
    data.userId,
    score ? { $inc: { opportunityScore: score } } : {},
  ).select("+referredBy");

  const referrerId = user?.referredBy?.user;
  if (!referrerId) return;

  await User.findByIdAndUpdate(referrerId, {
    $inc: { opportunityScore: referralScore },
  });
};
