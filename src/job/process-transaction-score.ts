import {
  cacheKey,
  retrieveSettings,
  type PurposeEnum,
  type IBaseJobType,
} from "@/common";
import { User } from "@/model";
import { evaluateBadge } from "./process-badge";

export interface ITransactionScoreJob extends IBaseJobType {
  userId: string;
  // Service the transaction belongs to, used for badge progress
  service?: `${PurposeEnum}`;
}

// Awards opportunity score for a completed transaction: `transaction` to the
// user, and `referralTransaction` to whoever referred them (if anyone).
const awardScore = async (userId: string) => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);
  const referAndEarn = settings?.referAndEarn;
  if (!referAndEarn?.enabled) return;

  const score = Math.abs(referAndEarn.opportunityScore?.transaction ?? 0);
  const referralScore = Math.abs(
    referAndEarn.opportunityScore?.referralTransaction ?? 0,
  );

  const user = await User.findByIdAndUpdate(
    userId,
    score ? { $inc: { opportunityScore: score } } : {},
  ).select("+referredBy");

  const referrerId = user?.referredBy?.user;
  if (!referrerId) return;

  await User.findByIdAndUpdate(referrerId, {
    $inc: { opportunityScore: referralScore },
  });
};

// Score first, then the badge check, so the badge sees the updated score.
export const processTransactionScore = async (data: ITransactionScoreJob) => {
  try {
    await awardScore(data.userId);
  } finally {
    if (data.service) await evaluateBadge(data.userId, data.service);
  }
};
