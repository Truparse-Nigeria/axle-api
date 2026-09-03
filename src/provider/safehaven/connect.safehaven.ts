import {
  ENVIRONMENT,
  HttpMethod,
  outboundProxyConfig,
  parseError,
  type IApiResponse,
} from "@/common";
import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { safehavenTokenHandler } from "./token.safehaven";

export const safehavenApi = axios.create({
  baseURL: ENVIRONMENT.SAFEHAVEN.URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  ...outboundProxyConfig,
});

export const callSafehaven = async <T extends { statusCode: number }>(
  url: string,
  method: HttpMethod,
  options?: { data?: any; params?: Record<string, any> },
): Promise<IApiResponse<T>> => {
  try {
    const accessToken = await safehavenTokenHandler();

    const config: AxiosRequestConfig = {
      url,
      method,
      ...(method === HttpMethod.GET
        ? { params: options?.params }
        : { ...options }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ClientID: ENVIRONMENT.SAFEHAVEN.CLIENT_ID,
      },
    };

    const response: AxiosResponse<T> = await safehavenApi.request(config);

    if (response.data.statusCode !== 200) {
      return { error: response.data };
    }

    return { data: response.data };
  } catch (error) {
    return { error: parseError(error) };
  }
};
