import type {
  BadgeEnum,
  PurposeEnum,
  CryptoCurrencyEnum,
  FiatCurrencyEnum,
  GenderEnum,
  SelfieStatusEnum,
  WalletStatusEnum,
} from "../enum";

export interface IFiatAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  provider?: string;
  externalReference?: string;
  externalId?: string;
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
  axleCoins: number;
  reward: number;
  fiat: Record<FiatCurrencyEnum, ICurrencyWallet<IFiatAccount>>;
  crypto: Record<CryptoCurrencyEnum, ICurrencyWallet<ICryptoAccount>>;
}

export interface IKycDetailSchema {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  phoneNumber: string;
  image?: string;
  idUrl?: string;
  country?: string;
  expirationDate?: string;
}

export interface IKycTypeSchema {
  completed?: boolean;
  identifier?: string;
  details?: IKycDetailSchema;
}

export interface IKycDetailAddressSchema {
  line1: string;
  line2?: string;
  state: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface IKycAddressSchema {
  completed?: boolean;
  details?: IKycDetailAddressSchema;
}

export interface ISelfieSchema {
  completed?: boolean;
  status?: SelfieStatusEnum;
  details?: { file: string };
}

export interface IKycSchema {
  bvn: IKycTypeSchema;
  nin: IKycTypeSchema;
  passport: IKycTypeSchema;
  address?: IKycAddressSchema;
  selfie?: ISelfieSchema;
}

export interface IUserBadge {
  // Unset until the user earns their first badge
  name?: BadgeEnum;
  // select: false on the schema; load it with "+badge.services"
  services?: PurposeEnum[];
}

export interface IUser {
  rowNumber?: number;
  badge?: IUserBadge;
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
  tag?: string;
  avatar?: string;
  jti?: string;
  messageToken?: string;
  wallet: IWallet;
  hasCard?: boolean;
  identifier?: IUserIdentifier;
  opportunityScore: number;
  referredBy?: {
    user?: string;
    amount?: number;
    completed?: boolean;
    blockedReason?: string | null;
  };
  kyc: IKycSchema;
  isDeleted?: boolean;
}

export interface IUserIdentifier {
  eversend?: string;
  sudo?: string;
  vitalswap?: {
    user: string;
    wallets: Record<FiatCurrencyEnum, string>
  }
}
