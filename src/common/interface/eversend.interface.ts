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
  color: string;
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
