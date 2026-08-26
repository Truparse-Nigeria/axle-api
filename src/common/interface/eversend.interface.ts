export interface IEversendToken {
  status: number;
  token: string;
}

export interface IEversendRes<T> {
  code: number;
  data: T;
  success: boolean;
  message?: string;
}

export interface IEversendCreateCardPayload {
  title: string;
  color?: string;
  amount: string;
  userId: string;
  currency: string;
  brand: string;
  isNonSubscription: boolean;
}

export interface IEversendCardBillingAddress {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface IEversendCard {
  id: string;
  securityCode: string;
  expiration: string;
  currency: string;
  status: string;
  isPhysical: boolean;
  title: string;
  color: string;
  name: string;
  amount: number;
  balance?: number;
  brand: string;
  mask: string;
  number: string;
  ownerId: string;
  isNonSubscription: boolean;
  lastUsedOn: string;
  createdAt: string;
  updatedAt: string;
  billingAddress: IEversendCardBillingAddress;
}

export interface IEversendCreateCardRes {
  message: string;
  card: IEversendCard;
}

export interface IEversendCardUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  address: string;
  zipCode: string;
  idType: string;
  idNumber: string;
}

export interface IEversendCardUser {
  id: number;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface IEversendCardUserRes {
  message: string;
  data: IEversendCardUser;
}

export interface IEversendFundCardPayload {
  cardId: string;
  amount: string;
  currency: string;
}

export interface IEversendWithdrawCardPayload {
  cardId: string;
  amount: string;
  currency: string;
}

// Fund/withdraw return the card's new balance directly.
export interface IEversendFundCardRes {
  message: string;
  balance: number;
}

export interface IEversendWithdrawCardRes {
  message: string;
  balance: number;
}

// Terminate/freeze/unfreeze all take just the card id and return a status
// message (e.g. "Card status changed successfully to active").
export interface IEversendCardActionPayload {
  cardId: string;
}

export interface IEversendCardActionRes {
  message: string;
}

// GET /cards/:id — the live card, including its remaining balance (`amount`)
// and total spend, nested two levels under the provider envelope.
export interface IEversendGetCardRes {
  message: string;
  data: {
    totalCardSpend: string;
    card: IEversendCard;
  };
}
