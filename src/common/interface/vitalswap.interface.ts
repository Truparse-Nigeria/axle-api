export interface IVitalSwapCreateCustomerPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  accept_terms: boolean;
  identity: {
    bvn: string;
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
