import {
  ENVIRONMENT,
  HttpMethod,
  parseError,
  type ISudoRes,
} from "@/common";
import axios, { type AxiosRequestConfig } from "axios";

export const sudoApi = axios.create({
  baseURL: ENVIRONMENT.SUDO.BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: ENVIRONMENT.SUDO.API_KEY,
  },
});

// Sudo wraps every response in { statusCode, message, data }. Failures (4xx)
// carry the same envelope, so `error.errorData` holds the Sudo body.
export const callSudoApi = async <T>(
  url: string,
  method: HttpMethod,
  options?: {
    data?: any;
    params?: Record<string, any>;
    // Overrides the default base URL, e.g. ENVIRONMENT.SUDO.VAULT_URL for
    // endpoints served by the Sudo vault.
    baseURL?: string;
  },
): Promise<{ data?: ISudoRes<T>; error?: Record<string, any> | null }> => {
  try {
    const config: AxiosRequestConfig = {
      url,
      method,
      ...(options?.baseURL && { baseURL: options.baseURL }),
      ...(method === HttpMethod.GET
        ? { params: options?.params }
        : { data: options?.data, params: options?.params }),
    };
    const response = await sudoApi.request<ISudoRes<T>>(config);

    return { data: response.data, error: null };
  } catch (error) {
    return { error: parseError(error) };
  }
};
