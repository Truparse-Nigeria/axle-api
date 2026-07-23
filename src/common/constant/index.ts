import type { ISendMail } from "../interface";

export type JOB_TYPE = "SEND_EMAIL";

export type TJobData = ISendMail;

export const cacheKey = {
  SETTINGS: "settings",
  CHEAP_DATA_KEY: "cheap-data",
  REGULAR_DATA_KEY: "regular-data",
};

export interface IApiResponse<T = null> {
  data?: T;
  error?: Record<string, any> | null;
}