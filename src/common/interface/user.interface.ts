import type {
  CryptoCurrencyEnum,
  FiatCurrencyEnum,
  GenderEnum,
  KycStatusEnum,
  SelfieStatusEnum,
  WalletStatusEnum,
} from "../enum";

export interface IFiatAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  provider?: string;
  externalReference?: string;
  rtpRoutingNumber?: string;
  wireRoutingNumber?: string;
  status?: string
  routing?: string
}

export interface ICryptoAccount {
  address: string;
  network: string;
  provider?: string;
}

export interface ICurrencyWallet<TAccount> {
  balance: number;
  status: WalletStatusEnum;
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
  selfie?: string;
  country?: string;
  expirationDate?: string;
}

export interface IKycTypeSchema {
  completed: KycStatusEnum;
  reason?: string;
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
  completed: KycStatusEnum;
  reason?: string;
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
  completed: KycStatusEnum;
  reason?: string;
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
  vitalswap?: {
    user: string;
    wallets: Record<FiatCurrencyEnum, string>
  }
}
