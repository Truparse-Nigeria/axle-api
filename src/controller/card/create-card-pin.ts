import {
  AppError,
  CardStatusEnum,
  createCardPinSchema,
  encryptData,
  sendResponse,
  validateRequestPayload,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Card } from "@/model";
import { sudoRevealCard, sudoUpdateCardPin } from "@/provider";

// Set the PIN on a Sudo (NGN) card. While the card still has its default PIN
// we fetch it from the Sudo vault and use it as the old PIN; afterwards the
// caller must supply their current PIN.
export const createCardPin = catchAsync(async (req, res) => {
  const { cardId, oldPin, newPin } = await validateRequestPayload(
    req.body,
    createCardPinSchema,
  );

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  const card = await Card.findOne({
    _id: cardId,
    user: user._id,
    status: { $ne: CardStatusEnum.TERMINATED },
  }).select("+provider");

  if (!card) {
    throw new AppError("Oops, This card does not exist");
  }

  if (card.provider !== VendorEnum.SUDO) {
    throw new AppError("PIN is not supported for this card");
  }

  if (card.defaultPinChange && !oldPin) {
    throw new AppError("Old PIN is required");
  }

  // Card secrets live in the Sudo vault
  const reveal = await sudoRevealCard(card.externalCardId);

  if (reveal.error || !reveal.data) {
    throw new AppError("Unable to set card PIN. Try again");
  }

  const { number, cvv2, defaultPin, expiryMonth, expiryYear } = reveal.data;

  const currentPin = card.defaultPinChange ? oldPin! : defaultPin;

  if (!currentPin) {
    throw new AppError("Unable to set card PIN. Try again");
  }

  const update = await sudoUpdateCardPin(card.externalCardId, {
    oldPin: currentPin,
    newPin,
  });

  if (update.error || !update.data) {
    throw new AppError("Unable to set card PIN. Try again");
  }

  // PAN/CVV/PIN are stored encrypted at rest — never in plaintext.
  const secureCardDetails = encryptData(
    JSON.stringify({
      cardNumber: number,
      expiryDate: `${expiryMonth}/${expiryYear}`,
      cvv: cvv2,
      pin: newPin,
    }),
  );

  await Card.findOneAndUpdate(
    { _id: card._id, user: user._id },
    { $set: { cardDetails: secureCardDetails, defaultPinChange: true } },
  );

  return sendResponse(res, 200, "Card PIN set successfully");
});
