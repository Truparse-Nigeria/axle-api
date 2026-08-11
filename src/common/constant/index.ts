import type { ISendMail } from "../interface";

export type JOB_TYPE = "SEND_EMAIL";

export type TJobData = ISendMail;

export const cacheKey = {
  SETTINGS: "settings",
  CHEAP_DATA_KEY: "cheap-data",
  REGULAR_DATA_KEY: "regular-data",
  EVERSEND_TOKEN_KEY: "eversend-token",
};

export const TxnDesc = {
  airtimePurchase: "Airtime purchase",
  dataPurchase: "Data purchase",
  tvSubscription: "TV Subscription purchase",
  electricity: "Electricity purchase",
  buyGiftCard: "Giftcard purchase",
  wallet2Wallet: "Axle to axle transfer",
  wallet2Bank: "Outbound transfer",
  topUp: "Inbound Transfer",
};

export const validationConstants = {
  NUMBER_GREATER_THAN_ZERO: "Amount must be greater than zero.",
};

// Fields hidden from non-privileged reads (mirrors the model's `select: false`)
export const SENSITIVE_TRANSACTION_FIELDS =
  "+responsePayload +requestPayload +settlement +meta +provider +initialBalance +finalBalance";

export interface IApiResponse<T = null> {
  data?: T;
  error?: Record<string, any> | null;
}