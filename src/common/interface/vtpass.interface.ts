export type TVtpassPay =
  | IVtpassAirtimePurchase
  | IVtpassElectricityPurchase
  | IVtpassCablePurchase
  | IVtpassDataPurchase

export interface IVtpassAirtimePurchase {
  request_id: string;
  serviceID: string;
  amount: number;
  phone: string;
}

export interface IVtpassDataPurchase {
  request_id: string;
  serviceID: string;
  amount?: number;
  billersCode: string;
  variation_code: string;
}

export interface IVtpassElectricityPurchase {
  request_id: string;
  serviceID: string;
  billersCode: string;
  variation_code: string;
  amount: number;
  phone: string | undefined;
}

export interface IVtpassCablePurchase extends IVtpassElectricityPurchase {
  subscription_type: string;
}

interface CommissionDetails {
  amount: number;
  rate: string;
  rate_type: string;
  computation_type: string;
}

interface Transaction {
  status: string;
  product_name: string;
  unique_element: string;
  unit_price: string;
  quantity: number;
  service_verification: string | null;
  channel: string;
  commission: number;
  total_amount: number;
  discount: number | null;
  type: string;
  email: string;
  phone: string;
  name: string | null;
  convinience_fee: number;
  amount: string;
  platform: string;
  method: string;
  transactionId: string;
  commission_details: CommissionDetails;
}

interface Content {
  transactions: Transaction;
}

export interface IVtpassPayResponse {
  code: string;
  content: Content;
  response_description: string;
  requestId: string;
  amount: number;
  transaction_date: string;
  purchased_code: string;
  token?: string;
  mainToken?: string;
  Token?: string;
  kct1?: string | null;
  kct2?: string | null;
  KCT1?: string | null;
  KCT2?: string | null;
  units?: string;
  mainTokenUnits?: string;
  Units?: string;
  customerAddress?: string;
  CustomerAddress?: string;
  customerName?: string;
  CustomerName?: string;
}

export interface IVtpassBalanceResponse {
  code: number;
  contents: {
    balance: number;
  };
}

export interface IVtpassVerify {
  billersCode: string;
  serviceID: string;
  type?: string;
}

export interface IVtpass<T> {
  code: string;
  response_description?: string;
  content: T;
}

export interface IVerifyRes {
  Customer_Name: string;
  Address: string;
  Meter_Number: string;
  Customer_Arrears?: string;
  Minimum_Amount?: string;
  Min_Purchase_Amount?: string;
  Can_Vend: "yes" | "no";
  Business_Unit?: string;
  Customer_Account_Type: string;
  Meter_Type: string;
  WrongBillersCode: boolean;
  Customer_Type?: string;
  Customer_Number?: string;
  commission_details: {
    amount?: number;
    rate: string;
    rate_type: string;
    computation_type: string;
  };
  error?: string;
}

export interface ServiceVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice: string;
}

export interface IServiceData {
  ServiceName: string;
  serviceID: string;
  convinience_fee: string;
  variations: ServiceVariation[];
  varations?: ServiceVariation[]; // Duplicate key in JSON, optional
}
