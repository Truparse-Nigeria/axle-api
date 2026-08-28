import type { GloesimPackageTypeEnum } from "../enum";

export interface IGloesimToken {
  status: boolean;
  access_token: string;
  token_type: string;
  user: {
    id: string;
    name: string;
    email: string;
    balance: number;
  };
}

export interface IGloesimRes<T> {
  status: boolean;
  data: T;
  meta?: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
  }
}

export interface IGloesimCountry {
  id: number;
  name: string;
  image_url: string;
}

// ---------------------------------------------------------------------------
// Raw package shapes (as returned by /developer/dealer/packages/country/...)
// ---------------------------------------------------------------------------

export interface IGloesimNetworkCoverage {
  network_name: string;
  network_code: string;
  two_g: boolean;
  three_g: boolean;
  four_G: boolean;
  five_G: boolean;
}

export interface IGloesimPackageCountry {
  id: number;
  name: string;
  image_url: string;
  network_coverage: IGloesimNetworkCoverage[];
}

export interface IGloesimZone {
  id: string;
  name: string;
  data: string;
  calls: string;
  sms: string;
  countries: string[];
}

export interface IGloesimPackage {
  id: string;
  name: string;
  extra_param: boolean;
  price: string;
  data_quantity: number;
  data_unit: string;
  voice_quantity: number;
  voice_unit: string;
  sms_quantity: number;
  package_validity: number;
  package_validity_unit: string;
  package_type: GloesimPackageTypeEnum | string;
  countries: IGloesimPackageCountry[];
  unlimited: boolean;
  other_info?: string;
  can_renew: number;
  policy?: string;
  network: string;
  activation_type_description: string;
  unthrottle_data: string | null;
  throttle_speed: string | null;
  connectivity: string;
  international_minutes: number | null;
  international_sms: number;
  zones?: IGloesimZone[];
}

// ---------------------------------------------------------------------------
// Normalized package shape (consumed by the client / UI layer)
// ---------------------------------------------------------------------------

export type TAllowance =
  | { kind: "amount"; value: number; unit?: string }
  | { kind: "unlimited" }
  | { kind: "none" };

export interface INormalizedNetwork {
  name: string;
  code: string;
  tech: string[];
}

export interface INormalizedCountry {
  id: number;
  name: string;
  flagUrl: string;
  networks: INormalizedNetwork[];
}

export type TThrottle =
  | { throttled: false }
  | { throttled: true; fullSpeedUpTo: string; reducedSpeed: string };

// Pricing inputs from the enabled eSIM provider settings. `markup` is a
// percentage applied to the raw USD price; `rate` converts the marked-up USD
// amount into Naira (Naira per USD).
export interface IGloesimPricing {
  markup: number;
  rate: number;
}

export interface IPriceAmount {
  amount: number;
  display: string;
}

// The provider quotes packages in USD. We always surface both currencies to the
// user: `usd` is the marked-up price in dollars and `ngn` is that same price
// converted to Naira at the provider rate. `baseUsd` keeps the untouched
// provider price (pre-markup) for internal reconciliation.
export interface INormalizedPrice {
  usd: IPriceAmount;
  ngn: IPriceAmount;
  baseUsd: number;
}

export interface INormalizedZone {
  id: string;
  name: string;
  data: string;
  calls: string;
  sms: string;
  countries: string[];
}

export interface INormalizedPackage {
  id: string;
  rawName: string;
  packageType: GloesimPackageTypeEnum | string;

  price: INormalizedPrice;
  validity: { value: number; unit: string; display: string };

  data: TAllowance;
  voice: TAllowance;
  sms: TAllowance;

  hasVoiceOrSms: boolean;
  isUnlimitedData: boolean;

  throttle: TThrottle;

  renewable: boolean;
  network: string;
  activation: { trigger: "first-byte" | "install" | "unknown"; description: string };

  connectivity: string[];

  countries: INormalizedCountry[];

  hasZones: boolean;
  zones: INormalizedZone[];

  bundledNumber?: string;
  coverageWarning?: string;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Package detail / requery (/developer/dealer/package/detail/:id)
// ---------------------------------------------------------------------------

export interface IGloesimPackageDetail {
  id: string;
  name: string;
  price: string;
  data_quantity: number;
  data_unit: string;
  voice_quantity: number;
  voice_unit: string;
  sms_quantity: number;
  package_validity: number;
  package_validity_unit: string;
  // NOTE: `romaing_countries` is the API's spelling (typo for "roaming").
  romaing_countries?: IGloesimPackageCountry[];
  countries: IGloesimPackageCountry[];
}

export interface INormalizedPackageDetail {
  id: string;
  rawName: string;
  price: INormalizedPrice;
  validity: { value: number; unit: string; display: string };
  data: TAllowance;
  voice: TAllowance;
  sms: TAllowance;
  hasVoiceOrSms: boolean;
  isUnlimitedData: boolean;
  connectivity: string[];
  countries: INormalizedCountry[];
  roamingCountries: INormalizedCountry[];
}

// ---------------------------------------------------------------------------
// Purchase request payloads
// ---------------------------------------------------------------------------

// DATA-ONLY plans only need the package + an optional existing eSIM to top up.
export interface IGloesimPurchaseDataOnly {
  package_type_id: string;
  iccid?: string;
}

// DATA-VOICE-SMS plans provision a real number, so they require KYC/address.
export interface IGloesimPurchaseDataVoiceSms {
  package_type_id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  imei: string;
  zipcode: string;
  city: string;
  state: string;
  street_number: string;
  street_name: string;
  street_direction?: string;
}

export type TGloesimPurchaseInput =
  | { packageType: GloesimPackageTypeEnum.DATA_ONLY; payload: IGloesimPurchaseDataOnly }
  | { packageType: GloesimPackageTypeEnum.DATA_VOICE_SMS; payload: IGloesimPurchaseDataVoiceSms };

// ---------------------------------------------------------------------------
// Purchase response shapes
// ---------------------------------------------------------------------------

export interface IGloesimSim {
  id: string;
  iccid: string;
  qr_code_text: string;
  smdp_address: string;
  matching_id: string;
  created_at: string;
  last_bundle: string;
  status: string;
  total_bundles: number;
  can_renew: boolean;
  universal_link: string;
  android_universal_link: string;
  policy: string;
  sim_applied: boolean;
  number: string | null;
}

export interface IGloesimPurchase {
  id: string;
  package_type_id: string;
  sim_id: string;
  package: string;
  initial_data_quantity: number;
  initial_data_unit: string;
  rem_data_quantity: number;
  rem_data_unit: string;
  date_created: string;
  date_activated: string | null;
  date_expiry: string | null;
  activated: boolean;
  status: string;
  sim: IGloesimSim;
  unlimited: boolean;
  extra_info: unknown;
}

// Trimmed, display-ready purchase result. The full raw payload is returned
// separately under `meta` by the provider so nothing is lost.
export interface INormalizedPurchase {
  id: string;
  packageName: string;
  status: string;
  activated: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;

  data: {
    isUnlimited: boolean;
    initial: { value: number; unit: string } | null;
    remaining: { value: number; unit: string } | null;
  };

  esim: {
    iccid: string;
    qrCodeText: string;
    smdpAddress: string;
    matchingId: string;
    iosInstallUrl: string;
    androidInstallUrl: string;
    applied: boolean;
    number: string | null;
    status: string;
  };

  renewable: boolean;
  notes: string[];
}
