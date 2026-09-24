export interface IVitalSwapCreateCustomerPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  accept_terms: boolean;
  identity: {
    bvn?: string;
    nationality: string;
    state_of_residence: string;
    id_number: string;
    id_type: string;
    id_image_url: string;
    selfie_image_url: string;
    date_of_birth: string;
    city: string;
    country: string;
    country_iso: string;
    lga_of_residence: string;
    postal_code: string;
    address: string;
    address_number: string;
  };
}

export interface IVitalSwapCreateCustomerResponse {
  message: string;
  title: string;
  user_id: string;
}

export interface IVitalSwapVirtualBankAccount {
  account_id: string;
  account_name: string;
  currency_code: string;
  account_number: string;
  rtp_routing_number: string;
  wire_routing_number: string;
  bank_name: string;
  created_date: string | null;
  vendor_reference: string | null;
  status: string | null;
  routing: string | null;
}

export interface IVitalSwapWallet {
  balance: string;
  currency: string;
  wallet_id: string;
  virtual_bank_accounts: IVitalSwapVirtualBankAccount[];
}

export interface IVitalSwapGetCustomerResponse {
  record_id: string;
  first_name: string;
  last_name: string;
  email: string;
  swap_tag: string | null;
  phone_number: string;
  business_name: string;
  business_description: string;
  country_of_business: string;
  status: string;
  profile_picture_url: string;
  user_tier: string;
  created_at: string;
  type: string;
  wallets: IVitalSwapWallet[];
  virtual_bank_accounts: IVitalSwapVirtualBankAccount[];
  virtual_cards: unknown[];
}

export interface IVitalSwapPayingAccountConsentResponse {
  signed: boolean;
  url: string;
}

export interface IVitalSwapPayingAccountProduct {
  currency: string;
  description: string;
  features: Record<string, any>;
  label_name: string;
  name: string;
  product_id: string;
}

export interface IVitalSwapCreatePayingAccountPayload {
  wallet_id: string;
  product_id?: string;
  bvn?: string;
}

export interface IVitalSwapCreatePayingAccountResponse {
  success?: boolean;
  error?: string;
  message: string;
}

// Webhooks — VitalSwap sends every field in both snake_case and camelCase;
// only the snake_case keys are typed here.
export interface IVitalSwapHookUser {
  customer_id: string;
  email: string;
  status: string;
  type: string;
  partner_id: string;
  first_name: string;
  last_name: string;
  swaptag: string | null;
}

interface IVitalSwapHookBase<E extends string, D> {
  event_id: string;
  event_name: E;
  event_user_id: string;
  url: string;
  data: D & { user: IVitalSwapHookUser };
}

export type IVitalSwapCreatedPartnerConsumerHook = IVitalSwapHookBase<
  "created_partner_consumer",
  {}
>;

export type IVitalSwapApprovedBridgeKycHook = IVitalSwapHookBase<
  "approved_bridge_kyc",
  { kyc_approved: boolean }
>;

export type IVitalSwapCreatedVirtualBankAccountHook = IVitalSwapHookBase<
  "created_virtual_bank_account",
  {
    record_id: string;
    created_date: string;
    user_wallet_record_id: string;
    vendor_reference: string;
    account_number: string;
    bank_name: string;
    account_name: string;
    product_record_id: string;
    status: string;
    routing: string;
    rtp: boolean;
    wire: boolean;
    currency_iso: string;
  }
>;

export type IVitalSwapCreditedVirtualAccountHook = IVitalSwapHookBase<
  "credited_virtual_account",
  {
    amount: number;
    currency_iso: string;
    wallet_id: string;
    deposit_id: string;
    virtual_account_id: string;
    transaction_type: "CREDIT";
    description: string;
    status: string;
  }
>;

export type IVitalSwapDebitedPartnerWalletHook = IVitalSwapHookBase<
  "debited_partner_wallet",
  {
    amount: number;
    currency_iso: string;
    wallet_id: string;
    transaction_id: string;
    recipient_user_id: string;
    recipient: string;
    transaction_type: "DEBIT";
    description: string;
    status: string;
  }
>;

export type IVitalSwapHook =
  | IVitalSwapCreatedPartnerConsumerHook
  | IVitalSwapApprovedBridgeKycHook
  | IVitalSwapCreatedVirtualBankAccountHook
  | IVitalSwapCreditedVirtualAccountHook
  | IVitalSwapDebitedPartnerWalletHook;
