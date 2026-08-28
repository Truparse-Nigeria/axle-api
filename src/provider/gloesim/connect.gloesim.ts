import {
  cacheKey,
  deleteCache,
  ENVIRONMENT,
  HttpMethod,
  parseError,
  type IApiResponse,
  type IGloesimRes,
} from "@/common";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { GloesimTokenHandler } from "./token.gloesim";

// Base axios client for GloeSIM. Auth (dealer login) does not need a bearer
// token, so this instance carries only the default headers.
export const gloesimApi = axios.create({
  baseURL: ENVIRONMENT.GLOESIM.URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const { GLOESIM_TOKEN_KEY } = cacheKey;

export const callGloesim = async <T>(
  url: string,
  method: HttpMethod,
  options?: {
    data?: any;
    params?: Record<string, any>;
    headers?: Record<string, any>;
  },
): Promise<IApiResponse<IGloesimRes<T>>> => {
  try {
    const token = await GloesimTokenHandler();

    const config: AxiosRequestConfig = {
      url,
      method,
      ...(method === HttpMethod.GET
        ? { params: options?.params }
        : { data: options?.data, params: options?.params }),
      headers: {
        authorization: `Bearer ${token}`,
        // Multipart callers pass `Content-Type: null` so axios computes the
        // form-data boundary instead of the instance's default JSON header.
        ...options?.headers,
      },
    };

    const response: AxiosResponse<IGloesimRes<T>> =
      await gloesimApi.request(config);

    if (response.data.status !== true) {
      return {
        error: {
          errorData: response.data,
        },
      };
    }

    return { data: response.data, error: null };
  } catch (error: any) {
    if (error?.response?.status === 401) {
      await deleteCache(GLOESIM_TOKEN_KEY);
    }

    return { error: parseError(error) };
  }
};
