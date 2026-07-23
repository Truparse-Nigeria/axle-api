import {
  AccessTypeEnum,
  AppError,
  cacheKey,
  retrieveSettings,
  sendResponse,
} from "@/common";
import { catchAsync } from "@/middleware";

export const getSettings = (accessType: AccessTypeEnum) =>
  catchAsync(async (req, res) => {
    // Only the user-facing access type gets the stripped copy. Every other
    // access type (admin, once it exists) reads the untouched settings.
    const key =
      accessType === AccessTypeEnum.USER
        ? `${cacheKey.SETTINGS}:SORTED`
        : `${cacheKey.SETTINGS}:FULL`;

    const settings = await retrieveSettings(key);

    if (!settings) {
      throw new AppError("This one is on us. Try again", 500);
    }

    return sendResponse(res, 200, null, settings);
  });
