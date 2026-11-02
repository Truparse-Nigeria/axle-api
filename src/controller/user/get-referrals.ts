import {
  AppError,
  sendResponse,
  superQuery,
  SuperQuerySchema,
  validateRequestPayload,
  type IUser,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User, type IUserDocument } from "@/model";

// Users who signed up with the requester's referral code
export const getReferrals = catchAsync(async (req, res) => {
  const { pagination, search } = await validateRequestPayload(
    req.body ?? {},
    SuperQuerySchema,
  );

  const user = req.user;
  if (!user) throw new AppError("User not found");

  const referrals = await superQuery<IUserDocument>(User, {
    filter: { referredBy: { user: String(user._id) } },
    search,
    pagination,
    includeFields: [
      "firstName",
      "lastName",
      "referredBy.amount",
      "referredBy.completed",
      "createdAt",
    ],
  });

  if (!referrals) {
    throw new AppError("Oops, we couldn't get your referrals. Please try again.");
  }

  return sendResponse(res, 200, "Referrals retrieved successfully", referrals);
});
