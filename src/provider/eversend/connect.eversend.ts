import {
  cacheKey,
  deleteCache,
  ENVIRONMENT,
  HttpMethod,
  outboundProxyConfig,
  parseError,
  type IApiResponse,
  type IEversendRes,
} from "@/common";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { EversendTokenHandler } from "./token.eversend";

export const eversendTokenApi = axios.create({
  baseURL: ENVIRONMENT.EVERSEND.URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  ...outboundProxyConfig,
});

const { EVERSEND_TOKEN_KEY } = cacheKey;

export const callEversend = async <T>(
  url: string,
  method: HttpMethod,
  options?: { data?: any; params?: Record<string, any> },
): Promise<IApiResponse<IEversendRes<T>>> => {
  try {
    const token = await EversendTokenHandler();
    console.log("Eversend Token:", token);

    const config: AxiosRequestConfig = {
      url,
      method,
      ...(method === HttpMethod.GET
        ? { params: options?.params }
        : { ...options }),
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const response: AxiosResponse<IEversendRes<T>> =
      await eversendTokenApi.request(config);

    if (
      response.data.success !== true ||
      ![200, 201].includes(response.data.code)
    ) {
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
      await deleteCache(EVERSEND_TOKEN_KEY);
    }

    return { error: parseError(error) };
  }
};
