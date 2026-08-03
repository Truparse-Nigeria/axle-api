export interface IReloadlyCountry {
  isoName: string;
  name: string;
  currencyCode: string;
  currencyName: string;
  flagUrl: string;
}

export interface IReloadlyCachedCountry {
  countryName: string;
  isoName: string;
}

export interface IReloadlyProductRequestPayload {
  size?: string;
  page?: string;
  countryCode?: string;
  productName?: string;
  includeRange: boolean;
  productCategoryId?: string;
  includeFixed: boolean;
}

export interface IContent {
  productId: number;
  productName: string;
  global: boolean;
  senderFee: number;
  senderFeePercentage: number;
  discountPercentage: number;
  denominationType: DenominationType;
  recipientCurrencyCode: string;
  minRecipientDenomination: number | null;
  maxRecipientDenomination: number | null;
  senderCurrencyCode: SenderCurrencyCode;
  minSenderDenomination: number | null;
  maxSenderDenomination: number | null;
  fixedRecipientDenominations: number[];
  fixedSenderDenominations: number[] | null;
  fixedSenderDenominationsVendor?: number[] | null;
  fixedRecipientToSenderDenominationsMap: { [key: string]: number } | null;
  logoUrls: string[];
  brand: Brand;
  country: Country;
  redeemInstruction: RedeemInstruction;
}

export interface IReloadlyProducts {
  content: IContent[];
  pageable: Pageable;
  totalElements: number;
  last: boolean;
  totalPages: number;
  sort: Sort;
  numberOfElements: number;
  first: boolean;
  size: number;
  number: number;
  empty: boolean;
  message?: boolean;
}

export enum DenominationType {
  Fixed = "FIXED",
  Range = "RANGE",
}

export enum SenderCurrencyCode {
  Ngn = "NGN",
}

export interface Brand {
  brandId: number;
  brandName: string;
}

export interface Country {
  isoName: string;
  name: string;
  flagUrl: string;
}

export interface RedeemInstruction {
  concise: string;
  verbose: string;
}

export interface Pageable {
  sort: Sort;
  pageNumber: number;
  pageSize: number;
  offset: number;
  unpaged: boolean;
  paged: boolean;
}

export interface Sort {
  sorted: boolean;
  unsorted: boolean;
  empty: boolean;
}

export interface IReloadlyCategory {
  id: string;
  name: string;
}

export interface IReloadlyCachedCategory {
  categoryId: string;
  categoryName: string;
}

export interface IReloadlyGiftcardOrderPayload {
  productId: string;
  quantity: number;
  senderName: string;
  unitPrice: number;
}

export interface IReloadlyOrder {
  amount: number;
  balanceInfo: object;
  currencyCode: string;
  customIdentifier: string;
  discount: number;
  fee: number;
  preOrdered: boolean;
  product: IReloadlyOrderProduct;
  recipientEmail: string;
  recipientPhone: string;
  smsFee: number;
  status: string;
  totalFee: number;
  transactionCreatedTime: string;
  transactionId: number;
}

export interface IReloadlyOrderProduct {
  productId: number;
  productName: string;
  countryCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currencyCode: string;
  brand: {
    brandId: number;
    brandName: string;
  };
}

export interface IReloadlyCachedProduct extends IReloadlyUnstrippedProps {
  fixedRecipientDenominations: Record<string, number>[];
  senderFee: number[] | undefined;
}

export interface IReloadlyUnstrippedProps {
  productId: number;
  productName: string;
  redeemInstruction: string;
  logoUrl: string | undefined;
  country: string;
  recipientCurrencyCode: string;
}

export interface IReloadlyRedeemGiftcard {
  cardNumber: number;
  pinCode: number;
}

export interface IReloadlyBalance {
  balance: number;
  currencyCode: string;
  currencyName: string;
  updatedAt: Date;
  message?: string;
}
