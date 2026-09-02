import type {
  CryptoCurrencyEnum,
  FiatCurrencyEnum,
  GenderEnum,
  SelfieStatusEnum,
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

export interface IKycDetailSchema {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  phoneNumber: string;
  image: string;
  country?: string;
  expirationDate?: string;
}

export interface IKycTypeSchema {
  completed?: boolean;
  identifier?: string;
  details: IKycDetailSchema;
}

export interface IKycSchema {
  bvn: IKycTypeSchema;
  nin: IKycTypeSchema;
  passport: IKycTypeSchema;
  driversLicense: IKycTypeSchema;
  address: IKycAddressSchema;
  selfie: ISelfieSchema;
}

export interface IKycAddressSchema {
  completed?: boolean;
  details: IKycDetailAddressSchema;
}

export interface IKycDetailAddressSchema {
  line1: string;
  line2?: string;
  state: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface ISelfieSchema {
  completed: boolean;
  status: SelfieStatusEnum;
  details: {
    file: string;
  };
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
  kyc: IKycSchema;
  isDeleted?: boolean;
}

export interface IUserIdentifier {
  eversend?: string;
}
