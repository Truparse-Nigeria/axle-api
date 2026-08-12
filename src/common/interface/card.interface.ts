import type { Document } from "mongoose";
import type {
  CardBrandEnum,
  CardStatusEnum,
  CardTypeEnum,
  CardVariantEnum,
  FiatCurrencyEnum,
} from "../enum";
import type { IUser } from "./user.interface";

export interface ICardAddress {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface ICard extends Document {
  user: string | IUser;
  cardName: string;
  customName: string;
  externalCustomerId: string;
  externalCardId: string;
  cardBrand: CardBrandEnum;
  balance: number;
  expirationDate: string;
  currency: FiatCurrencyEnum;
  firstSix: string;
  lastFour: string;
  cardDetails?: string;
  cardType: CardTypeEnum;
  provider: string;
  variant: CardVariantEnum;
  status: CardStatusEnum;
  address?: ICardAddress;
  reason?: string;
  declineCount?: number;
}
