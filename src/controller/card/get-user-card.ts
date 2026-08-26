import {
  AppError,
  CardStatusEnum,
  sendResponse,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card } from "@/model";

export const getUserCard = catchAsync(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // A user's non-terminated cards, newest first. `cardDetails`,
  // `externalCustomerId` and `provider` are `select: false`, so the encrypted
  // PAN/CVV and provider ids are never returned here.
  const cards = await Card.find({
    user: user._id,
    status: { $ne: CardStatusEnum.TERMINATED },
  }).sort({ createdAt: -1 });

  return sendResponse(res, 200, null, cards);
});
