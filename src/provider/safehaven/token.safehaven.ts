import type { AxiosResponse } from "axios";
import {
  deduplicationHandler,
  deleteCache,
  ENVIRONMENT,
  getCache,
  setCache,
  type ISafeHavenTokenResponse,
} from "@/common";
import { safehavenApi } from "./connect.safehaven";

const safehavenTokenKey = "SAFEHAVEN_TOKEN";

export const safehavenToken = async (): Promise<string | null> => {
  const accessToken = await getCache(`ACCESS_${safehavenTokenKey}`);
  if (accessToken) {
    return accessToken as string;
  }

  const refreshToken = await getCache(`REFRESH_${safehavenTokenKey}`);

  try {
    const response: AxiosResponse<ISafeHavenTokenResponse> =
      await safehavenApi.post("/oauth2/token", {
        grant_type: refreshToken ? "refresh_token" : "client_credentials",
        client_assertion_type: ENVIRONMENT.SAFEHAVEN.CLIENT_ASSERTION_TYPE,
        client_id: ENVIRONMENT.SAFEHAVEN.CLIENT_ID,
        client_assertion: ENVIRONMENT.SAFEHAVEN.CLIENT_ASSERTION,
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
      });

    if (!response.data.refresh_token && !response.data.access_token) {
      await deleteCache(`ACCESS_${safehavenTokenKey}`);
      await deleteCache(`REFRESH_${safehavenTokenKey}`);
      return null;
    }

    // Token expires in 30mins
    await setCache(
      `ACCESS_${safehavenTokenKey}`,
      response.data.access_token,
      30 * 60,
    );
    await setCache(
      `REFRESH_${safehavenTokenKey}`,
      response.data.refresh_token,
      24 * 60 * 60,
    );

    return response.data.access_token;
  } catch (error) {
    await deleteCache(`ACCESS_${safehavenTokenKey}`);
    await deleteCache(`REFRESH_${safehavenTokenKey}`);
    return null;
  }
};

export const safehavenTokenHandler = async () =>
  await deduplicationHandler(
    `DEDUPLICATION_${safehavenTokenKey}`,
    safehavenToken,
  );
