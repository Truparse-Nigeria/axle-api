import { cacheKey, retrieveSettings, type IBaseJobType } from "@/common";
import { User } from "@/model";

export interface IKycCompleteJob extends IBaseJobType {
  userId: string;
}

// Awards the referrer opportunity score when a referred user completes a KYC
// step (BVN, NIN, passport or address).
export const processKycComplete = async (data: IKycCompleteJob) => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);
  const referAndEarn = settings?.referAndEarn;
  if (!referAndEarn?.enabled) return;

  const score = Math.abs(referAndEarn.opportunityScore?.kycComplete ?? 0);
  if (!score) return;

  const user = await User.findById(data.userId).select("+referredBy");
  const referrerId = user?.referredBy?.user;
  if (!referrerId) return;

  await User.findByIdAndUpdate(referrerId, {
    $inc: { opportunityScore: score },
  });
};
