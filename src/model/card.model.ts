import { Schema, model, type Model } from "mongoose";
import {
  CardBrandEnum,
  CardStatusEnum,
  CardTypeEnum,
  CardVariantEnum,
  FiatCurrencyEnum,
  VendorEnum,
  type ICard,
} from "../common";

const CardSchema = new Schema<ICard>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cardName: { type: String, required: true },
    customName: { type: String, required: true },
    // Provider-side customer/user id that owns the card — sensitive, never
    // returned on normal reads.
    externalCustomerId: {
      type: String,
      required: true,
      select: false,
    },
    externalCardId: { type: String, unique: true, required: true },
    cardBrand: {
      type: String,
      enum: Object.values(CardBrandEnum),
      required: true,
    },
    balance: { type: Number, default: 0, required: true },
    expirationDate: { type: String, required: true },
    currency: {
      type: String,
      enum: Object.values(FiatCurrencyEnum),
      required: true,
    },
    firstSix: { type: String, required: true },
    lastFour: { type: String, required: true },
    // Encrypted PAN/CVV blob — never stored or returned in plaintext.
    cardDetails: { type: String, select: false },
    cardType: {
      type: String,
      enum: Object.values(CardTypeEnum),
      default: CardTypeEnum.VIRTUAL,
    },
    provider: {
      type: String,
      enum: [VendorEnum.EVERSEND],
      default: VendorEnum.EVERSEND,
      select: false,
    },
    variant: {
      type: String,
      enum: Object.values(CardVariantEnum), // pro in this case is Eversend
      default: CardVariantEnum.PRO,
    },
    status: {
      type: String,
      enum: Object.values(CardStatusEnum),
      default: CardStatusEnum.ACTIVE,
    },
    // Billing address returned by the provider; shape is provider-defined.
    address: {
      type: Schema.Types.Mixed,
    },
    reason: String,
    declineCount: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

CardSchema.index({ user: 1 });
CardSchema.index({ user: 1, status: 1 });
CardSchema.index({ user: 1, status: 1, balance: 1 });

export const Card: Model<ICard> = model<ICard>("Card", CardSchema);
