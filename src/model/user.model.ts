import { Schema, model, type Document, type Model } from "mongoose";
import {
  CryptoCurrencyEnum,
  FiatCurrencyEnum,
  GenderEnum,
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
    messageToken: { type: String, trim: true },
    wallet: {
      type: WalletSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export const UserModel: Model<IUserDocument> = model<IUserDocument>(
  "User",
  userSchema
);
