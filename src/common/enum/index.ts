export enum GenderEnum {
  MALE = "Male",
  FEMALE = "Female",
}

export enum OtpPrefixEnum {
  OTP_ATTEMPT = "OTP_ATTEMPT",
  OTP_STORE = "OTP_STORE",
  OTP_FINALIZER = "OTP_FINALIZER",
}

export enum FiatCurrencyEnum {
  NGN = "NGN",
  USD = "USD",
  GBP = "GBP",
  EUR = "EUR",
}

export enum CryptoCurrencyEnum {
  USDT = "USDT",
  USDC = "USDC",
}

export enum OtpContextEnum {
  RESET_PASSCODE = "RESET_PASSCODE",
  VERIFY_EMAIL = "VERIFY_EMAIL",
  RESET = "RESET_PIN",
}

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PATCH = "PATCH",
  PUT = "PUT",
  DELETE = "DELETE",
}

export enum DiscosEnum {
  ABA = "Aba Electricity",
  AEDC = "Abuja Electricity",
  BEDC = "Benin Electricity",
  EEDC = "Enugu Electricity",
  EKEDC = "Eko Electricity",
  IBEDC = "Ibadan Electricity",
  IKEDC = "Ikeja Electricity",
  JED = "Jos Electricity",
  KAEDCO = "Kaduna Electricity",
  KEDCO = "Kano Electricity",
  PHED = "Port Harcourt Electricity",
  YEDC = "Yola Electricity",
}

export enum CardBrandEnum {
  MASTERCARD = "MasterCard",
  VISA = "Visa",
}

export enum StatusEnum {
  PROCESSING = "PROCESSING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REVERSAL = "REVERSAL",
}

export enum PurposeEnum {
  POWER = "POWER",
  AIRTIME = "AIRTIME",
  DATA = "DATA",
  CABLE = "CABLE",
  GIFTCARD = "GIFTCARD",
  WALLET = "WALLET",
  TRANSFER = "TRANSFER",
  CARDS = "CARDS",
  REFER_AND_EARN = "REFER AND EARN",
}

export enum ActivityEnum {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

export enum VendorEnum {
  VTPASS = "vtpass",
  SAFE_HAVEN = "safehaven",
  RELOADLY = "reloadly",
  EVERSEND = "eversend",
  AXLE = "axle",
}

export enum CardVariantEnum {
  PRO = "pro",
  VANILLA = "vanilla",
}

export enum CardStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
  FROZEN = "frozen",
  TERMINATED = "terminated",
}

export enum CardTypeEnum {
  PHYSICAL = "physical",
  VIRTUAL = "virtual",
}

export enum ErrorLevelEnum {
  PROVIDER = "PROVIDER",
  SYSTEM = "SYSTEM",
}

export enum VtpassCableEnum {
  CHANGE = "change",
  RENEW = "RENEW",
}

