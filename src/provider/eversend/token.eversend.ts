import {
  cacheKey,
  deduplicationHandler,
  deleteCache,
  ENVIRONMENT,
  getCache,
  setCache,
  type IEversendToken,
} from "@/common";
import type { AxiosResponse } from "axios";
import { eversendTokenApi } from "./connect.eversend";

const { EVERSEND_TOKEN_KEY } = cacheKey;

export const eversendToken = async (): Promise<string | null> => {
  const accessToken = await getCache(EVERSEND_TOKEN_KEY);

  if (accessToken) {
    return accessToken as string;
  }

  try {
    const response: AxiosResponse<IEversendToken> = await eversendTokenApi.get(
      "/auth/token",
      {
        headers: {
          "Content-Type": "application/json",
          clientId: ENVIRONMENT.EVERSEND.CLIENT_ID,
          clientSecret: ENVIRONMENT.EVERSEND.CLIENT_SECRET,
        },
      },
    );

    // Token expires in 10 mins
    const accessToken = response.data?.token;

    await setCache(EVERSEND_TOKEN_KEY, accessToken, 10 * 60);

    return accessToken!;
  } catch (error) {
    await deleteCache(EVERSEND_TOKEN_KEY);
    return null;
  }
};

export const EversendTokenHandler = async () =>
  await deduplicationHandler(
    `DEDUPLICATION_${EVERSEND_TOKEN_KEY}`,
    eversendToken,
  );
