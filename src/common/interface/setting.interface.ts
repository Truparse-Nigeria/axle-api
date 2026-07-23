import type { CardBrandEnum } from "../enum";

export interface IProvider {
  enabled: boolean;
  rate: number;
  charge?: number;
  slug: string;
  code?: string;
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
  fundingCharge: {
    providerPercent: number;
    percent: number;
    fixed: number;
  };
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

export interface ISettings {
  airtime: IBiller;
  cheapData: IBiller;
  electricity: IElectricity;
  cable: IBiller;
  regularData: IBiller;
  giftcard: IGiftcard;
  cards: Record<string, ICardSettings>;
  airtimeToCash: IAirtimeToCash;
  crypto: ICrypto;
}
