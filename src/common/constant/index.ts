import type {
  IGenerateMultiCurrency,
  IProcessStaticAccount,
  IVitalSwapIdentifer,
} from "@/job";
import type { ISendMail } from "../interface";
import { FiatCurrencyEnum } from "../enum";

export type JOB_TYPE =
  | "SEND_EMAIL"
  | "PROCESS_STATIC_ACCOUNT"
  | "GENERATE_MULTICURRENCY_ACCOUNT"
  | "VITALSWAP_WALLET";

export type TJobData =
  | ISendMail
  | IProcessStaticAccount
  | IGenerateMultiCurrency
  | IVitalSwapIdentifer;

export const cacheKey = {
  SETTINGS: "settings",
  CHEAP_DATA_KEY: "cheap-data",
  REGULAR_DATA_KEY: "regular-data",
  EVERSEND_TOKEN_KEY: "eversend-token",
  GLOESIM_TOKEN_KEY: "gloesim-token",
  GLOESIM_COUNTRY_KEY: "gloesim-country",
};

export const TxnDesc = {
  airtimePurchase: "Airtime purchase",
  dataPurchase: "Data purchase",
  tvSubscription: "TV Subscription purchase",
  electricity: "Electricity purchase",
  buyGiftCard: "Giftcard purchase",
  esimPurchase: "eSIM purchase",
  wallet2Wallet: "Axle to axle transfer",
  wallet2Bank: "Outbound transfer",
  topUp: "Inbound Transfer",
  dollarCardCreation: "Dollar card creation",
  dollarCardFunding: "Dollar card funding",
  dollarCardWithdrawal: "Dollar card withdrawal",
  dollarCardTermination: "Dollar card termination",
};

// Default billing/ID details used when provisioning an Eversend card user and
// card. These are placeholders while KYC is not yet collected on the user — swap
// them for the user's real KYC data once address/ID capture is in place.
export const DEFAULT_CARD_ADDRESS = {
  address: "8 The Green Ste R",
  city: "Dover County",
  state: "Delaware",
  zipCode: "19901",
  country: "US",
};

export const validationConstants = {
  NUMBER_GREATER_THAN_ZERO: "Amount must be greater than zero.",
};

// Fields hidden from non-privileged reads (mirrors the model's `select: false`)
export const SENSITIVE_TRANSACTION_FIELDS =
  "+responsePayload +requestPayload +settlement +meta +provider +initialBalance +finalBalance";

// Single source of truth for user fields that must never reach an API response.
export const SENSITIVE_USER_FIELDS =
  "+passcode +pin +jti +referredBy +messageToken +isDeleted +__v +kyc.bvn.details +kyc.bvn.identifier +kyc.nin.details +kyc.nin.identifier +kyc.passport.details +kyc.passport.identifier";

export interface IApiResponse<T = null> {
  data?: T;
  error?: Record<string, any> | null;
}

// Non-NGN fiat currencies provisioned through the multicurrency flow. NGN is
// handled by the safehaven static-account job and never enters PROCESSING here.
export const MULTICURRENCY_FIATS = [
  FiatCurrencyEnum.USD,
  FiatCurrencyEnum.GBP,
  FiatCurrencyEnum.EUR,
] as const;

export * from "./state-city";
