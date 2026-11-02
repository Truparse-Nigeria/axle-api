import {
  BadgeEnum,
  PurposeEnum,
  cacheKey,
  retrieveSettings,
  type IBaseJobType,
} from "@/common";
import { User } from "@/model";

export interface IBadgeJob extends IBaseJobType {
  userId: string;
  service: `${PurposeEnum}`;
}

const BADGE_ORDER = Object.values(BadgeEnum);

// Records the service the user just used, then promotes them to the highest
// badge whose requirements (distinct services, opportunityScore, referrals)
// they now meet. Badges only ever go up. Called after a successful
// transaction, so opportunityScore already includes it.
export const evaluateBadge = async (
  userId: string,
  service?: `${PurposeEnum}`,
) => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);
  const tiers = settings?.referAndEarn?.badge;
  if (!tiers) return;

  // $addToSet is atomic and idempotent, and hands back the fresh counts
  const user = await User.findByIdAndUpdate(
    userId,
    service ? { $addToSet: { "badge.services": service } } : {},
    { new: true },
  )
    .select("+badge.services")
    .lean();
  if (!user) return;

  // -1 = no badge yet, so even the lowest tier still has to be earned
  const current = user.badge?.name ? BADGE_ORDER.indexOf(user.badge.name) : -1;
  const services = user.badge?.services?.length ?? 0;
  const points = user.opportunityScore ?? 0;

  // Highest tier first. The referral count is the only extra query, so it is
  // made lazily, and only once a tier is already met on services and points.
  let referrals: number | undefined;

  for (let i = BADGE_ORDER.length - 1; i > current; i--) {
    const name = BADGE_ORDER[i]!;
    const tier = tiers[name];

    if (!tier || services < tier.service || points < tier.points) continue;

    referrals ??= await User.countDocuments({ "referredBy.user": userId });
    if (referrals < tier.referral) continue;

    // The $nin guard stops a concurrent job from being overwritten with a
    // lower tier.
    await User.updateOne(
      { _id: userId, "badge.name": { $nin: BADGE_ORDER.slice(i) } },
      { $set: { "badge.name": name } },
    );
    return;
  }
};

// For flows that do not award opportunity score (e.g. local transfers)
export const processBadge = async (data: IBadgeJob) =>
  evaluateBadge(data.userId, data.service);
