export interface IBlaacRes<T> {
  status: string;
  data?: T;
  responseCode: string;
  message?: string;
}

export interface IBlaacToken {
  token: string;
}

export interface IBlaacDataReq {
  dataId: string;
  mobileNumber: string;
}

export interface IBlaacPurchaseResponse {
  balanceAfter: number;
  transaction: {
    organization: string;
    walletId: string;
    amount: number;
    reference: string;
    status: string;
    type: string;
    currency: string;
    reason: string;
    description: string;
    initialBalance: number;
    finalBalance: number;
    _id: string;
    createdAt: string;
    updatedAt: string;
  };
}
