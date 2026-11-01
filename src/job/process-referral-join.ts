import {
  cacheKey,
  retrieveSettings,
  type IBaseJobType,
} from "@/common";
import { User } from "@/model";

export interface IReferralJoinJob extends IBaseJobType {
  referrerId: string;
}

// Awards the referrer opportunity score when someone signs up with their
// referral code. The job is enqueued once per signup.
export const processReferralJoin = async (data: IReferralJoinJob) => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);
  const referAndEarn = settings?.referAndEarn;
  if (!referAndEarn?.enabled) return;

  const score = Math.abs(referAndEarn.opportunityScore?.referralJoin ?? 0);
  if (!score) return;

  await User.findByIdAndUpdate(data.referrerId, {
    $inc: { opportunityScore: score },
  });
};
