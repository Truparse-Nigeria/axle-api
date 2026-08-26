import {
  AppError,
  CardStatusEnum,
  freezeCardSchema,
  pinCheck,
  sendResponse,
  validateRequestPayload,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card } from "@/model";
import { eversendFreezeCard, eversendUnfreezeCard } from "@/provider";

export const freezeCard = catchAsync(async (req, res) => {
  const { cardId, pin } = await validateRequestPayload(
    req.body,
    freezeCardSchema,
  );

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // Validate the user's pin (also enforces the wrong-PIN lockout)
  await pinCheck(pin, user?.pin, String(user._id));

  // Card must exist, belong to the user, and not be terminated. `provider` is
  // `select: false`, so it must be explicitly selected to route the call.
  const card = await Card.findOne({
    _id: cardId,
    user: user._id,
    status: { $ne: CardStatusEnum.TERMINATED },
  }).select("+provider");

  if (!card) {
    throw new AppError("Oops, This card does not exist");
  }

  // Toggle: an active card gets frozen (-> inactive), otherwise it gets
  // unfrozen (-> active). active === unfrozen, inactive === frozen.
  const isActive = card.status === CardStatusEnum.ACTIVE;
  const nextStatus = isActive
    ? CardStatusEnum.INACTIVE
    : CardStatusEnum.ACTIVE;

  // Dispatch to the right provider call based on the card's provider.
  let response = null;
  if (card.provider === VendorEnum.EVERSEND) {
    response = isActive
      ? await eversendFreezeCard({ cardId: card.externalCardId })
      : await eversendUnfreezeCard({ cardId: card.externalCardId });
  }

  if (response?.error || !response?.data) {
    throw new AppError(
      isActive
        ? "Oh Snap! Unable to freeze card. Try again!"
        : "Oh Snap! Unable to unfreeze card. Try again!",
    );
  }

  // Persist the new status atomically (never document.save()).
  const updatedCard = await Card.findByIdAndUpdate(
    card._id,
    { $set: { status: nextStatus } },
    { new: true },
  );

  if (!updatedCard) {
    throw new AppError("Unable to update card status. Try again!");
  }

  const message = isActive
    ? "Card frozen successfully"
    : "Card unfrozen successfully";

  return sendResponse(res, 200, message, { status: updatedCard.status });
});
