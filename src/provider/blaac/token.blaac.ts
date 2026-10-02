import {
  cacheKey,
  deduplicationHandler,
  deleteCache,
  ENVIRONMENT,
  getCache,
  setCache,
  type IBlaacRes,
  type IBlaacToken,
} from "@/common";
import type { AxiosResponse } from "axios";
import { blaacTokenApi } from "./connect.blaac";

const { BLAAC_TOKEN_KEY } = cacheKey;

export const blaacToken = async (): Promise<string | null> => {
  const accessToken = await getCache(BLAAC_TOKEN_KEY);

  if (accessToken) {
    return accessToken as string;
  }

  try {
    const response: AxiosResponse<IBlaacRes<IBlaacToken>> =
      await blaacTokenApi.post("/auth/authenticate", {
        clientId: ENVIRONMENT.BLAAC.CLIENT_ID,
        clientSecret: ENVIRONMENT.BLAAC.CLIENT_SECRET,
      });

    // Token expires in 10 mins
    const accessToken = response.data.data?.token;

    await setCache(BLAAC_TOKEN_KEY, accessToken, 10 * 60);

    return accessToken!;
  } catch (error) {
    await deleteCache(BLAAC_TOKEN_KEY);
    return null;
  }
};

export const BlaacTokenHandler = async () =>
  await deduplicationHandler(`DEDUPLICATION_${BLAAC_TOKEN_KEY}`, blaacToken);
