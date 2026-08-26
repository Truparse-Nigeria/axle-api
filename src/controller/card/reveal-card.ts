import {
  AppError,
  CardStatusEnum,
  decryptData,
  pinCheck,
  revealCardSchema,
  sendResponse,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card } from "@/model";

export const revealCard = catchAsync(async (req, res) => {
  const { cardId, pin } = await validateRequestPayload(
    req.body,
    revealCardSchema,
  );

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // Validate the user's pin (also enforces the wrong-PIN lockout)
  await pinCheck(pin, user?.pin, String(user._id));

  // Card must exist, belong to the user, and not be terminated. `cardDetails`
  // is `select: false`, so it must be explicitly selected here.
  const card = await Card.findOne({
    _id: cardId,
    user: user._id,
    status: { $ne: CardStatusEnum.TERMINATED },
  }).select("+cardDetails");

  if (!card) {
    throw new AppError("Oops, This card does not exist");
  }

  if (!card.cardDetails) {
    throw new AppError("Card details are unavailable");
  }

  // Decrypt the secured PAN/CVV blob. It was stored as
  // `encryptData(JSON.stringify({ cardNumber, expiryDate, cvv }))`.
  let reveal: { cardNumber: string; expiryDate: string; cvv: string };
  try {
    reveal = JSON.parse(decryptData(card.cardDetails));
  } catch {
    throw new AppError("Unable to reveal card details");
  }

  return sendResponse(res, 200, "Card details revealed", {
    cardNumber: reveal.cardNumber,
    expiryDate: reveal.expiryDate,
    cvv: reveal.cvv,
  });
});
