import { getCache, type ISettings } from "@/common";
import { initiateSettings } from "@/controller";

export const retrieveSettings = async (key: string): Promise<ISettings> => {
  let settings = await getCache<ISettings>(key);
  if (!settings) {
    // Try initiating settings from db and checking again
    settings = await initiateSettings(key);
  }
  return settings;
};
