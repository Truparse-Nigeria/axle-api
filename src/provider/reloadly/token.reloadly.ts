import {
  deduplicationHandler,
  deleteCache,
  ENVIRONMENT,
  getCache,
  setCache,
} from "@/common";
import type { AxiosResponse } from "axios";
import { reloadlyApi } from "./connect.reloadly";

const reloadlyTokenKey = "RELOADLY_TOKEN";

export const reloadlyToken = async (): Promise<string | null> => {
  const accessToken = await getCache<string>(reloadlyTokenKey);
  if (accessToken) {
    return accessToken;
  }

  try {
    const response: AxiosResponse = await reloadlyApi.post(
      `${ENVIRONMENT.RELOADLY.AUTH_URL}/oauth/token`,
      {
        client_id: ENVIRONMENT.RELOADLY.CLIENT_ID,
        client_secret: ENVIRONMENT.RELOADLY.CLIENT_SECRET,
        grant_type: "client_credentials",
        audience: ENVIRONMENT.RELOADLY.URL,
      },
    );

    const accessToken = response.data.access_token;

    // Token lives for ~24h upstream; we cache it for 10 mins to stay safe
    await setCache(reloadlyTokenKey, accessToken, 10 * 60);

    return accessToken;
  } catch (error) {
    await deleteCache(reloadlyTokenKey);
    return null;
  }
};

export const reloadlyTokenHandler = async () =>
  await deduplicationHandler(`DEDUPLICATION_${reloadlyTokenKey}`, reloadlyToken);
