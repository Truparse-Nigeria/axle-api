import {
  ENVIRONMENT,
  HttpMethod,
  parseError,
  type IApiResponse,
} from "@/common";
import axios, { type AxiosRequestConfig } from "axios";

export const dojahAPI = axios.create({
  baseURL: ENVIRONMENT.DOJAH.URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    AppId: ENVIRONMENT.DOJAH.APP_ID,
    Authorization: ENVIRONMENT.DOJAH.SECRET_KEY,
  },
});

// General Dojah API call handler
export const callDojah = async <T>(
  url: string,
  method: HttpMethod,
  options?: { data?: any; params?: Record<string, any> }
): Promise<IApiResponse<T>> => {
  try {
    const config: AxiosRequestConfig = {
      url,
      method,
      ...(method === HttpMethod.GET
        ? { params: options?.params }
        : { ...options }),
    };
    const response = await dojahAPI.request(config);

    return { data: response.data, error: null };
  } catch (error) {
    return { error: parseError(error) };
  }
};
