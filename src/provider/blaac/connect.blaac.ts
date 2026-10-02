import {
  blaacSignature,
  cacheKey,
  deleteCache,
  ENVIRONMENT,
  generateRandomString,
  HttpMethod,
  parseError,
  type IApiResponse,
  type IBlaacRes,
} from "@/common";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { BlaacTokenHandler } from "./token.blaac";

export const blaacApi = axios.create({
  baseURL: ENVIRONMENT.BLAAC.URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Token endpoint lives under /merchant while purchases live under /purchases
export const blaacTokenApi = axios.create({
  baseURL: ENVIRONMENT.BLAAC.URL!.replace("purchases", "merchant"),
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const { BLAAC_TOKEN_KEY } = cacheKey;

// Every request is signed with HMAC(method&path&nonce&clientId)
const headers = (token: string, url: string, method: string) => {
  const nonce = generateRandomString(32);
  const baseString = `${method}&${encodeURIComponent(url)}&${nonce}&${ENVIRONMENT.BLAAC.CLIENT_ID}`;

  return {
    "x-auth-token": token,
    "x-nonce": nonce,
    "x-signature": blaacSignature(baseString, ENVIRONMENT.BLAAC.CLIENT_SECRET!),
  };
};

export const callBlaac = async <T>(
  url: string,
  method: HttpMethod,
  options?: { data?: any; params?: Record<string, any> },
): Promise<IApiResponse<IBlaacRes<T>>> => {
  try {
    const token = await BlaacTokenHandler();

    const config: AxiosRequestConfig = {
      url,
      method,
      ...(method === HttpMethod.GET
        ? { params: options?.params }
        : { ...options }),
      headers: headers(token, url, method),
    };

    const response: AxiosResponse<IBlaacRes<T>> =
      await blaacApi.request(config);

    if (response.data.status !== "success") {
      return {
        error: {
          message: response.data?.message,
          errorData: response.data,
        },
      };
    }

    return { data: response.data, error: null };
  } catch (error: any) {
    if (error?.response?.status === 401) {
      await deleteCache(BLAAC_TOKEN_KEY);
    }

    return { error: parseError(error) };
  }
};
