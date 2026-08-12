import { Schema, model, type Document, type Model } from "mongoose";
import {
  CryptoCurrencyEnum,
  deleteFields,
  FiatCurrencyEnum,
  GenderEnum,
  SENSITIVE_USER_FIELDS,
  type IUser,
} from "../common";

export interface IUserDocument extends IUser, Document {}

const FiatAccountSchema = new Schema(
  {
    accountNumber: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    provider: { type: String, trim: true },
  },
  { _id: false },
);

const CryptoAccountSchema = new Schema(
  {
    address: { type: String, required: true, trim: true },
    network: { type: String, required: true, trim: true },
    provider: { type: String, trim: true },
  },
  { _id: false },
);

const currencyWallet = (accountSchema: Schema) =>
  new Schema(
    {
      balance: { type: Number, default: 0 },
      accounts: { type: [accountSchema], default: [] },
    },
    { _id: false },
  );

const FiatCurrencyWalletSchema = currencyWallet(FiatAccountSchema);
const CryptoCurrencyWalletSchema = currencyWallet(CryptoAccountSchema);

const WalletSchema = new Schema(
  {
    fiat: Object.fromEntries(
      Object.values(FiatCurrencyEnum).map((currency) => [
        currency,
        { type: FiatCurrencyWalletSchema, default: () => ({}) },
      ]),
    ),
    crypto: Object.fromEntries(
      Object.values(CryptoCurrencyEnum).map((currency) => [
        currency,
        { type: CryptoCurrencyWalletSchema, default: () => ({}) },
      ]),
    ),
  },
  { _id: false },
);

// External provider customer/user identifiers. `eversend` holds the id of the
// card user provisioned with Eversend, created once per user before their first
// Eversend card can be issued.
const IdentifierSchema = new Schema(
  {
    eversend: { type: String, trim: true },
  },
  { _id: false },
);

const ReferredBySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    amount: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    dialCode: { type: String, required: true, trim: true },
    referralCode: { type: String, trim: true, unique: true, sparse: true },
    referredBy: {
      type: ReferredBySchema,
      select: false,
    },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: {
      type: String,
      enum: Object.values(GenderEnum),
      required: true,
    },
    passcode: {
      type: String,
      required: true,
      select: false,
    },
    pin: {
      type: String,
      select: false,
    },
    jti: {
      type: String,
      select: false,
    },
    messageToken: { type: String, trim: true },
    wallet: {
      type: WalletSchema,
      default: () => ({}),
    },
    hasCard: { type: Boolean, default: false },
    identifier: {
      type: IdentifierSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

// Automatic backstop: strip sensitive fields whenever a user *document* is
// serialized, driven by the same SENSITIVE_USER_FIELDS constant that
// deleteFields() and superQuery `hiddenFields` use. This covers document/
// toObject responses; lean() results and aggregation (superQuery) are plain
// objects that bypass this — those paths strip explicitly instead.
const hideSensitiveFields = (_doc: unknown, ret: Record<string, any>) => {
  delete ret.__v;
  return deleteFields(ret, SENSITIVE_USER_FIELDS);
};

userSchema.set("toJSON", { transform: hideSensitiveFields });
userSchema.set("toObject", { transform: hideSensitiveFields });

export const User: Model<IUserDocument> = model<IUserDocument>(
  "User",
  userSchema,
);
