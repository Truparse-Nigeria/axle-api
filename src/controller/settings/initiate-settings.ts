import {
  AppError,
  cacheKey,
  sendResponse,
  setCache,
  sortSettings,
  type ISettings,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Settings } from "@/model";
import mongoose from "mongoose";

export const settingsPair = async (settings: ISettings) => {
  // cache untouched original
  await setCache<ISettings>(`${cacheKey.SETTINGS}:FULL`, settings);

  // clone BEFORE modifying — JSON round-trip avoids structuredClone failing on BSON ObjectId
  const sorted = sortSettings(JSON.parse(JSON.stringify(settings)));

  await setCache<ISettings>(`${cacheKey.SETTINGS}:SORTED`, sorted);

  return {
    [`${cacheKey.SETTINGS}:FULL`]: settings,
    [`${cacheKey.SETTINGS}:SORTED`]: sorted,
  };
};

// This is not an endpoint. It is a helper function to reset settings when needed
export const initiateSettings = async (key: string) => {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const getSettings = await Settings.findOne({}).session(session).lean();

      if (!getSettings) {
        const [update] = await Settings.create([{}], { session });

        if (!update) {
          throw new AppError("Settings creation failed");
        }

        const value = await settingsPair(update.toObject() as ISettings);
        return value[key] as ISettings;
      }

      // Recreating the document is what pulls in schema defaults added since
      // the document was first written.
      const { _id, ...update } = getSettings;

      await Settings.deleteOne({ _id }).session(session);
      const [newSettings] = await Settings.create([{ ...update }], { session });

      if (!newSettings) {
        throw new AppError("Settings creation failed");
      }

      const value = await settingsPair(newSettings.toObject() as ISettings);

      return value[key] as ISettings;
    });
  } finally {
    await session.endSession();
  }
};

export const refreshSettings = catchAsync(async (req, res) => {
  await initiateSettings(`${cacheKey.SETTINGS}:FULL`);

  return sendResponse(res, 200, "Settings refreshed successfully");
});
