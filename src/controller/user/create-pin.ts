import {
  AccessTypeEnum,
  AppError,
  createHash,
  createPinSchema,
  getModel,
  sendResponse,
  validateRequestPayload,
  type TUser,
} from "@/common";
import { catchAsync } from "@/middleware";

// Customer only endpoint
export const createPin = (accessType: AccessTypeEnum) =>
  catchAsync(async (req, res) => {
    const { pin } = await validateRequestPayload(req.body, createPinSchema);

    const user = req.user as TUser;

    if (!user) {
      throw new AppError("User not found");
    }

    // `pin` is `select: false`, so authGuard doesn't attach it — fetch explicitly
    const existingUser = await getModel(accessType)
      .findById(user._id)
      .select("+pin");

    if (existingUser?.pin) {
      throw new AppError("Nice try! You already have a PIN.", 400);
    }

    const hashPin = await createHash(pin);

    await getModel(accessType).findByIdAndUpdate(user._id, {
      pin: hashPin,
    });

    sendResponse(res, 200, "You're good to go! PIN created.");
  });
