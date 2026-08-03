import {
  ENVIRONMENT,
  HttpMethod,
  parseError,
  type IApiResponse,
} from "@/common";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { reloadlyTokenHandler } from "./token.reloadly";

// Generate request configs for initializing reloadly
export const reloadlyApi = axios.create({
  baseURL: ENVIRONMENT.RELOADLY.URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// General Reloadly API call handler
export const callReloadly = async <T>(
  url: string,
  method: HttpMethod,
  options?: { data?: any; params?: Record<string, any> },
): Promise<IApiResponse<T>> => {
  try {
    const token = await reloadlyTokenHandler();

    const config: AxiosRequestConfig = {
      url,
      method,
      ...(method === HttpMethod.GET
        ? { params: options?.params }
        : { ...options }),
      headers: {
        Accept: "application/com.reloadly.giftcards-v1+json",
        Authorization: `Bearer ${token}`,
      },
    };

    const response: AxiosResponse<T> = await reloadlyApi.request(config);

    return { data: response.data, error: null };
  } catch (error) {
    return { error: parseError(error) };
  }
};
