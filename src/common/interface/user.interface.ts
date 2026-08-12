import type {
  CryptoCurrencyEnum,
  FiatCurrencyEnum,
  GenderEnum,
} from "../enum";

export interface IFiatAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  provider?: string;
}

export interface ICryptoAccount {
  address: string;
  network: string;
  provider?: string;
}

export interface ICurrencyWallet<TAccount> {
  balance: number;
  accounts: TAccount[];
}

export interface IWallet {
  fiat: Record<FiatCurrencyEnum, ICurrencyWallet<IFiatAccount>>;
  crypto: Record<CryptoCurrencyEnum, ICurrencyWallet<ICryptoAccount>>;
}

export interface IUser {
  email: string;
  phone: string;
  dialCode: string;
  referralCode?: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: GenderEnum;
  passcode: string;
  pin?: string;
  jti?: string;
  messageToken?: string;
  wallet: IWallet;
  hasCard?: boolean;
  identifier?: IUserIdentifier;
  referredBy?: {
    user?: string;
    amount?: number;
    completed?: boolean;
  };
}

export interface IUserIdentifier {
  eversend?: string;
}
