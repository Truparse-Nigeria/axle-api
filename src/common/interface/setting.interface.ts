import type { CardBrandEnum } from "../enum";

export interface IProvider {
  enabled: boolean;
  rate: number;
  charge?: number;
  slug: string;
  code?: string;
  NIP?: number; // Only used for bank transfers
  stamp?: {
    fee: number;
    above: number;
  };
}

export interface INetworkBase {
  name: string;
  enabled: boolean;
  rate?: number;
}

export interface INetwork extends INetworkBase {
  providers?: Record<string, IProvider>;
}

export interface IBiller {
  enabled: boolean;
  charge?: number;
  networks: Record<string, INetwork>;
}

export interface IDisco {
  name: string;
  enabled: boolean;
  code: string;
  providers: Record<string, IProvider>;
}

export interface IElectricity {
  enabled: boolean;
  charge: number;
  discos: Record<string, IDisco>;
}

export interface IAirtimeToCashNetwork extends INetworkBase {
  providers?: Record<string, IProvider>;
}

export interface IAirtimeToCash {
  enabled: boolean;
  min: number;
  max: number;
  perDay: number;
  networks: Record<string, IAirtimeToCashNetwork>;
}

export interface IGiftcardProvider {
  enabled: boolean;
  rate: number;
  rateMarkup: number;
  slug: string;
}

export interface IGiftcard {
  enabled: boolean;
  charge?: number;
  providers: Record<string, IGiftcardProvider>;
}

export interface ICustomRates {
  withdrawal: number;
  funding: number;
  base: number;
}

export interface ICardBrandInfo {
  description: {
    support: string;
    cardBillingAddress: string;
    terminationPolicy: string;
    cardControl: string;
  };
  fees: {
    cardCreation: string;
    declineFees: string;
    maintenance: string;
    crossBorderFees: string;
    Rewards: string;
  };
}

export interface ICardBrandProperties {
  name: CardBrandEnum;
  create: boolean;
  fund: boolean;
  withdraw: boolean;
  minCardBalance: number;
  minFundingOnCreation: number;
  providerCreationFee: number;
  maxDepositPerTime: number;
  monthlyTransactionLimit: number;
  minFund: number;
  currency: string;
  creationFee: number;
  declineFee: number;
  maintenance: number;
  crossBorder: {
    percentage: number;
    flat: number;
  };
  fundingCharge: {
    providerPercent: number;
    percent: number;
    fixed: number;
  };
  info: ICardBrandInfo;
}

export interface INgnCardBrandInfo {
  description: {
    shopOnline: string;
    payForSubscription: string;
    tapToPay: string;
    stayInControl: string;
  };
  fees: {
    cardCreation: string;
    authorization: string;
    atmWithdrawal: string;
    maintenance: string;
    DisputeResolution: string;
  };
}

export interface INgnCardBrandProperties {
  name: CardBrandEnum;
  create: boolean;
  withdraw: boolean;
  providerCreationFee: number;
  currency: string;
  creationFee: number;
  authorizationFee: number;
  atmWithdrawalFee: number;
  disputeResolutionFee: number;
  maintenance: number;
  info: INgnCardBrandInfo;
}

export interface INgnCardSettings {
  maxCardCreation: number;
  brandConfig: Record<string, INgnCardBrandProperties>;
}

export interface ICardServiceCheck extends ICardBrandProperties {
  rate?: ICustomRates;
}

export interface ICardBrandSettings {
  maxCardCreation: number;
  brandConfig: Record<string, ICardBrandProperties>;
}

export interface ICardSettings {
  active: boolean;
  instruction: string;
  customRates: ICustomRates;
  currency: Record<string, ICardBrandSettings>;
}

export interface ICryptoProvider {
  enabled: boolean;
  rate: number;
  withdrawalFee: number;
  slug: string;
}

export interface ICryptoOption {
  name: string;
  enabled: boolean;
  deposit: boolean;
  withdraw: boolean;
  swap: boolean;
  providers: Record<string, ICryptoProvider>;
}

export interface ICrypto {
  enabled: boolean;
  options: Record<string, ICryptoOption>;
}

export interface IEsimProvider {
  enabled: boolean;
  rate: number; // Naira per USD
  markup: number; // in %
  slug: string;
}

export interface IEsim {
  enabled: boolean;
  providers: Record<string, IEsimProvider>;
}

export interface IMultiCurrencyOption {
  enabled: boolean;
  providers: Record<string, IProvider>;
}

export interface IMultiCurrency {
  enabled: boolean;
  currencies: Record<string, IMultiCurrencyOption>;
}

export interface IMoneyTransfer {
  enabled: boolean;
  options: Record<string, INetwork>;
}

export interface ISocials {
  facebook: string;
  x: string;
  instagram: string;
  website: string;
  telegram: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
}

export interface IGeneral {
  email: string;
  phone: string;
  socials: ISocials;
}

export interface ISettings {
  airtime: IBiller;
  cheapData: IBiller;
  electricity: IElectricity;
  cable: IBiller;
  regularData: IBiller;
  giftcard: IGiftcard;
  cards: { ngn: INgnCardSettings } & Record<string, ICardSettings | INgnCardSettings>;
  airtimeToCash: IAirtimeToCash;
  crypto: ICrypto;
  esim: IEsim;
  multiCurrency: IMultiCurrency;
  moneyTransfer: IMoneyTransfer;
  general: IGeneral;
}
