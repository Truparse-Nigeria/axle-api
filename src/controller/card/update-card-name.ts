import {
  AppError,
  sendResponse,
  updateCardNameIdSchema,
  updateCardNameSchema,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card } from "@/model";

export const updateCardName = catchAsync(async (req, res) => {
  const { customName } = await validateRequestPayload(
    req.body,
    updateCardNameSchema,
  );
  const { cardId } = await validateRequestPayload(
    req.params,
    updateCardNameIdSchema,
  );

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // `cardDetails`, `externalCustomerId` and `provider` are `select: false`,
  // so the returned card never exposes them.
  const updatedCard = await Card.findOneAndUpdate(
    { _id: cardId, user: user._id },
    { $set: { customName } },
    { new: true },
  );

  if (!updatedCard) {
    throw new AppError("Unable to update card name");
  }

  return sendResponse(res, 200, "Card name updated successfully", updatedCard);
});
