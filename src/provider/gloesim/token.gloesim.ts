import {
  cacheKey,
  deduplicationHandler,
  deleteCache,
  ENVIRONMENT,
  getCache,
  setCache,
  type IGloesimToken,
} from "@/common";
import type { AxiosResponse } from "axios";
import { gloesimApi } from "./connect.gloesim";

const { GLOESIM_TOKEN_KEY } = cacheKey;

// Dealer login returns a bearer access token. The API does not advertise an
// expiry, so we cache conservatively and let a 401 in the request layer bust
// the cache and force a fresh login.
const GLOESIM_TOKEN_TTL = 10 * 60; // 10 minutes

export const gloesimToken = async (): Promise<string | null> => {
  const accessToken = await getCache(GLOESIM_TOKEN_KEY);

  if (accessToken) {
    return accessToken as string;
  }

  try {
    const response: AxiosResponse<IGloesimToken> = await gloesimApi.post(
      "/developer/dealer/login",
      {
        email: ENVIRONMENT.GLOESIM.EMAIL,
        password: ENVIRONMENT.GLOESIM.PASSWORD,
      },
    );

    const accessToken = response.data?.access_token;

    await setCache(GLOESIM_TOKEN_KEY, accessToken, GLOESIM_TOKEN_TTL);

    return accessToken!;
  } catch (error) {
    await deleteCache(GLOESIM_TOKEN_KEY);
    return null;
  }
};

// Collapses concurrent token requests into a single in-flight login.
export const GloesimTokenHandler = async () =>
  await deduplicationHandler(
    `DEDUPLICATION_${GLOESIM_TOKEN_KEY}`,
    gloesimToken,
  );
