export interface ISudoRes<T = null> {
  statusCode: number;
  message: string;
  data: T;
}

export interface ISudoAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ISudoIndividual {
  firstName: string;
  lastName: string;
  otherNames?: string;
  dob: string;
  identity?: {
    type: string;
    number: string;
  };
  documents?: {
    idFrontUrl?: string;
    idBackUrl?: string;
    addressVerificationUrl?: string;
  };
}

export interface ISudoCreateCustomerReq {
  type: "individual" | "company";
  name: string;
  phoneNumber: string;
  status: "active" | "inactive";
  emailAddress: string;
  billingAddress: ISudoAddress;
  individual: ISudoIndividual;
}

export interface ISudoCustomer {
  _id: string;
  business: string;
  type: "individual" | "company";
  name: string;
  status: string;
  isApproved: boolean;
  phoneNumber: string;
  emailAddress: string;
  individual: ISudoIndividual;
  billingAddress: ISudoAddress;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface ISudoSpendingControls {
  allowedCategories?: string[];
  blockedCategories?: string[];
  channels?: {
    atm: boolean;
    pos: boolean;
    web: boolean;
    mobile: boolean;
  };
  spendingLimits?: {
    amount: number;
    interval: "daily" | "weekly" | "monthly" | "yearly";
  }[];
}

export interface ISudoCreateCardReq {
  customerId: string;
  type: "physical" | "virtual";
  currency: "NGN" | "USD";
  status: "active" | "inactive";
  fundingSourceId?: string;
  brand?: "Verve" | "AfriGo" | "MasterCard" | "Visa";
  /** Card PAN (Verve/AfriGo) or Card ID (Visa). Required for physical cards. */
  number?: string;
  enable2FA?: boolean;
  issuerCountry?: "NGA" | "USA";
  metadata?: string;
  spendingControls?: ISudoSpendingControls;
  bankCode?: string;
  accountNumber?: string;
  /** Card _id being replaced; requires replacementReason. */
  replacementFor?: string;
  replacementReason?: "lost" | "stolen";
  /** Required for all virtual cards and gift cards. */
  debitAccountId?: string;
  /** Funding amount. Required for MasterCard. */
  amount?: number;
  sendPINSMS?: boolean;
  /** Visa only, format MMM-YYYY (e.g. AUG-2025); max validity 3 years. */
  expirationDate?: string;
}

export interface ISudoCard {
  _id: string;
  business: string;
  customer: string;
  account: string;
  fundingSource: string;
  program?: string | null;
  type: "physical" | "virtual";
  brand: string;
  currency: string;
  maskedPan: string;
  expiryMonth: string;
  expiryYear: string;
  metadata?: Record<string, any> | null;
  status: string;
  replacedFor?: string | null;
  spendingControls: {
    _id?: string;
    channels: {
      _id?: string;
      atm: boolean;
      pos: boolean;
      web: boolean;
      mobile: boolean;
    };
    allowedCategories: string[];
    blockedCategories: string[];
    spendingLimits: {
      _id?: string;
      amount: number;
      interval: string;
      categories: string[];
    }[];
  };
  is2FAEnabled?: boolean;
  is2FAEnrolled: boolean;
  isDefaultPINChanged: boolean;
  disposable: boolean;
  refundAccount: string | null;
  providerReference?: string;
  isDigitalized?: boolean;
  failedTransactionCount?: number;
  minimumBalance?: number;
  version?: string;
  accumulatedFees?: number;
  totalFeesCharged?: number;
  feeChargeDay?: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface ISudoDigitizeCardRes {
  status: string;
  card: string;
}

export interface ISudoUpdateCardReq {
  status: "active" | "inactive" | "canceled";
  fundingSourceId?: string;
  metadata?: string;
  /** Required when status is "canceled". */
  cancellationReason?: "lost" | "stolen";
  /** Required only when status is "canceled". */
  creditAccountId?: string;
  spendingControls?: ISudoSpendingControls;
}

// Vault reveal (GET /cards/:id?reveal=true) — card secrets alongside the card
export interface ISudoRevealCardRes {
  _id: string;
  type: "physical" | "virtual";
  brand: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  /** CVV used for online (card-not-present) transactions. */
  cvv2: string;
  defaultPin: string;
  status: string;
}

export interface ISudoUpdateCardPinReq {
  oldPin: string;
  newPin: string;
}

// Webhooks — Sudo posts every event as { _id, type, environment, data: { object } }.
// Only the fields we read are typed; `card` and `customer` arrive expanded.
export interface ISudoAuthorizationObject {
  _id: string;
  customer?: { _id: string };
  card?: Pick<ISudoCard, "_id" | "status" | "maskedPan" | "currency">;
  amount: number;
  fee?: number;
  vat?: number;
  currency: string;
  merchantAmount?: number;
  merchant?: { name?: string; category?: string; city?: string; country?: string };
  transactionMetadata?: { channel?: string; type?: string; reference?: string };
  // Identifies the authorization attempt; Sudo may redeliver it on timeout.
  pendingRequest?: { _id: string; amount?: number; currency?: string };
}

export interface ISudoAuthorizationRequestHook {
  _id: string;
  type: "authorization.request";
  environment?: string;
  data: { object: ISudoAuthorizationObject };
}

// One-time code Sudo issues when a card transaction needs 2FA. Here `card`
// arrives with its `customer` expanded, unlike on authorization.request.
export interface ISudoAuthorizationCodeHook {
  _id: string;
  type: "authorization.code";
  environment?: string;
  data: {
    object: {
      code: string;
      card?: Pick<
        ISudoCard,
        "_id" | "status" | "maskedPan" | "currency" | "brand"
      > & { customer?: { _id: string } };
    };
  };
}

export type ISudoHook =
  | ISudoAuthorizationRequestHook
  | ISudoAuthorizationCodeHook
  | { _id: string; type: string; data?: Record<string, any> };

// Sudo reads the card network response code from the body: "00" approves,
// anything else declines (e.g. "51" insufficient funds, "62" restricted card).
export interface ISudoAuthorizationRes {
  statusCode: number;
  data: { responseCode: string };
}
