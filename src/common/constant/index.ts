import type { ISendMail } from "../interface";

export type JOB_TYPE = "SEND_EMAIL";

export type TJobData = ISendMail;

export interface IApiResponse<T = null> {
  data?: T;
  error?: Record<string, any> | null;
}