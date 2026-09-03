import type { ClientSession } from "mongoose";
import type { StatusEnum, VendorEnum } from "../enum";

// Streamlined bank representation shared across bank service providers.
export interface IBank {
  bankCode: string;
  bankName: string;
}

export interface ISafeHavenResponse<T = null> {
  statusCode: number;
  responseCode?: string;
  data: T;
  message?: string;
}

export interface ISafeHavenTokenResponse {
  access_token: string;
  client_id: string;
  expires_in: number;
  ibs_client_id: string;
  ibs_user_id: string;
  refresh_token?: string;
  token_type: string;
}

export interface ISafeHavenBank {
  name: string;
  routingKey: string;
  logoImage?: string;
  bankCode: string;
  categoryId: string;
  nubanCode?: string;
}

export interface ISafehavenTransferResponse {
  _id: string;
  client: string;
  account?: string;
  type?: string;
  sessionId: string;
  nameEnquiryReference: string;
  paymentReference: string;
  externalReference?: string;
  isReversed: boolean;
  reversalReference?: string;
  provider: string;
  destinationInstitutionCode: string;
  creditAccountName: string;
  creditAccountNumber: string;
  debitAccountName: string;
  debitAccountNumber: string;
  narration?: string;
  amount: number;
  fees: number;
  vat: number;
  stampDuty: number;
  responseCode: string;
  responseMessage: string;
  status: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  approvedAt: string;
  // Defined by us purely for internal consumption and status checking
  meta: {
    status: StatusEnum;
  };
}

export interface NotificationSettings {
  _id: string;
  smsNotification: boolean;
  emailNotification: boolean;
  emailMonthlyStatement: boolean;
  smsMonthlyStatement: boolean;
}

export interface ISafeHavenSubAccount {
  _id: string;
  client: string;
  accountProduct: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currencyCode: string;
  bvn: string;
  accountBalance: number;
  status: string;
  isSubAccount: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  cbaAccountId: string;
}

export interface ICreateSafeHavenAccountV2 {
  phoneNumber: string;
  externalReference: string;
  emailAddress: string;
  autoSweep?: boolean;
  identityNumber: string;
  identityType: string;
  autoSweepDetails?: {
    schedule: string;
    accountNumber: string;
  };
  dateOfBirth?: string;
  booleanMatch?: boolean;
}

export interface ISafeHavenHook {
  type: string;
  eventType?: string;
  data: ISafehavenTransferResponse;
}

// Params for crediting a wallet + creating a transaction from an inbound hook.
export interface IProcessTransactionParams {
  userId: string;
  provider: VendorEnum;
  fundedAmount: number;
  reference: string;
  requestPayload: ISafehavenTransferResponse;
  view: Record<string, any>;
  session: ClientSession;
  fullPayload?: ISafeHavenHook;
}
