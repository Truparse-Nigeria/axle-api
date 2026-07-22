import {
  ENVIRONMENT,
  HttpMethod,
  parseError,
  StatusEnum,
  type IApiResponse,
  type IVtpassPayResponse,
} from "@/common";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

// Setup VTpass Basic Auth
const vtpassAuth = () => {
  const token = `${ENVIRONMENT.VT_PASS.USERNAME}:${ENVIRONMENT.VT_PASS.PASSWORD}`;
  return Buffer.from(token).toString("base64");
};

// Generate a basic auth token for VTpass
const vtpassApi = axios.create({
  baseURL: ENVIRONMENT.VT_PASS.URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    Authorization: `Basic ${vtpassAuth()}`,
    "Content-Type": "application/json",
  },
});

export const handleVtpassPayResponse = (response: IVtpassPayResponse) => {
  const { code, content } = response;

  // If no data or invalid structure
  if (!code) return StatusEnum.FAILED;

  const status = content?.transactions?.status?.toLowerCase();

  // Success case
  if (code === "000" && status === "delivered") return StatusEnum.SUCCESS;

  // Processing cases
  if (code === "000" && ["initiated", "pending"].includes(status || ""))
    return StatusEnum.PROCESSING;

  if (code === "099") return StatusEnum.PROCESSING;

  return StatusEnum.FAILED;
};

export const callVtpass = async <T>(
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

    const response: AxiosResponse<T> = await vtpassApi.request(config);
    return {data: response.data};
  } catch (error) {
    return  {error: parseError(error)};
  }
};
