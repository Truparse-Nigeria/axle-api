import {
  ENVIRONMENT,
  HttpMethod,
  parseError,
  type IApiResponse,
} from "@/common";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

export const vitalSwapApi = axios.create({
  baseURL: ENVIRONMENT.VITALSWAP.BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "business-user-id": ENVIRONMENT.VITALSWAP.BUSINESS_USER_ID,
    Authorization: `Api-Key ${ENVIRONMENT.VITALSWAP.API_KEY}`,
  },
});

export const callVitalSwap = async <T>(
  url: string,
  method: HttpMethod,
  options?: { data?: any; params?: Record<string, any> },
): Promise<IApiResponse<T>> => {
  try {
    const config: AxiosRequestConfig = {
      url,
      method,
      ...(method === HttpMethod.GET
        ? { params: options?.params }
        : { ...options }),
    };

    const response: AxiosResponse<T> = await vitalSwapApi.request(config);

    return { data: response.data, error: null };
  } catch (error) {
    return { error: parseError(error) };
  }
};
