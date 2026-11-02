import {
  ActivityEnum,
  cacheKey,
  getCache,
  PurposeEnum,
  retrieveSettings,
  sendResponse,
  setCache,
  StatusEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction, User } from "@/model";

const LEADERBOARD_SIZE = 10;
const CACHE_SECONDS = 60;
// The board follows Nigerian time (UTC+1, no DST) so it resets at local midnight
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

// Purposes whose flows fire PROCESS_TRANSACTION_SCORE
const SCORED_PURPOSES = [
  PurposeEnum.AIRTIME,
  PurposeEnum.DATA,
  PurposeEnum.CABLE,
  PurposeEnum.POWER,
  PurposeEnum.GIFTCARD,
  PurposeEnum.ESIM,
  PurposeEnum.CARDS,
];

interface ILeaderboardEntry {
  user: string;
  name: string;
  tag?: string;
  avatar?: string;
  points: number;
}

// [start, end) of the current month in Lagos time, plus its cache key
const currentMonth = () => {
  const lagosNow = new Date(Date.now() + LAGOS_OFFSET_MS);
  const year = lagosNow.getUTCFullYear();
  const month = lagosNow.getUTCMonth();

  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    start: new Date(Date.UTC(year, month, 1) - LAGOS_OFFSET_MS),
    end: new Date(Date.UTC(year, month + 1, 1) - LAGOS_OFFSET_MS),
  };
};

// Points are derived, not stored: a user's scored transactions this month times
// `transaction`, plus the scored transactions of everyone they referred times
// `referralTransaction`.
const buildLeaderboard = async (): Promise<ILeaderboardEntry[]> => {
  const settings = await retrieveSettings(`${cacheKey.SETTINGS}:FULL`);
  const referAndEarn = settings?.referAndEarn;
  if (!referAndEarn?.enabled) return [];

  const own = Math.abs(referAndEarn.opportunityScore?.transaction ?? 0);
  const referral = Math.abs(
    referAndEarn.opportunityScore?.referralTransaction ?? 0,
  );
  if (!own && !referral) return [];

  const { start, end } = currentMonth();

  return Transaction.aggregate<ILeaderboardEntry>([
    {
      $match: {
        createdAt: { $gte: start, $lt: end },
        status: StatusEnum.SUCCESS,
        activity: ActivityEnum.DEBIT,
        purpose: { $in: SCORED_PURPOSES },
      },
    },
    { $group: { _id: "$user", count: { $sum: 1 } } },
    {
      $lookup: {
        from: User.collection.name,
        localField: "_id",
        foreignField: "_id",
        pipeline: [{ $project: { referredBy: 1 } }],
        as: "spender",
      },
    },
    {
      $project: {
        entries: [
          { user: "$_id", points: { $multiply: ["$count", own] } },
          {
            // Blocked referrals earn their referrer nothing
            user: {
              $cond: [
                {
                  $eq: [
                    {
                      $ifNull: [
                        { $first: "$spender.referredBy.blockedReason" },
                        null,
                      ],
                    },
                    null,
                  ],
                },
                { $first: "$spender.referredBy.user" },
                null,
              ],
            },
            points: { $multiply: ["$count", referral] },
          },
        ],
      },
    },
    { $unwind: "$entries" },
    { $match: { "entries.user": { $ne: null }, "entries.points": { $gt: 0 } } },
    { $group: { _id: "$entries.user", points: { $sum: "$entries.points" } } },
    {
      $lookup: {
        from: User.collection.name,
        localField: "_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              tag: 1,
              avatar: 1,
              isDeleted: 1,
            },
          },
        ],
        as: "profile",
      },
    },
    { $unwind: "$profile" },
    { $match: { "profile.isDeleted": { $ne: true } } },
    // Ties go to whoever has the lower id, so the order is stable between calls
    { $sort: { points: -1, _id: 1 } },
    { $limit: LEADERBOARD_SIZE },
    {
      $project: {
        _id: 0,
        user: { $toString: "$_id" },
        name: { $concat: ["$profile.firstName", " ", "$profile.lastName"] },
        tag: "$profile.tag",
        avatar: "$profile.avatar",
        points: 1,
      },
    },
  ]);
};

export const getLeaderboard = catchAsync(async (req, res) => {
  const { key } = currentMonth();
  const cacheId = `${cacheKey.LEADERBOARD}:${key}`;

  let board = await getCache<ILeaderboardEntry[]>(cacheId);
  if (!board) {
    board = await buildLeaderboard();
    await setCache(cacheId, board, CACHE_SECONDS);
  }

  const me = String(req.user?._id);

  return sendResponse(res, 200, "Leaderboard retrieved successfully", {
    month: key,
    leaderboard: board.map(({ user, ...entry }, index) => ({
      rank: index + 1,
      ...entry,
      isMe: user === me,
    })),
  });
});
