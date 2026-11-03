import { Schema, model, type Document, type Model } from "mongoose";
import {
  BadgeEnum,
  computeChatIdentity,
  PurposeEnum,
  CryptoCurrencyEnum,
  deleteFields,
  FiatCurrencyEnum,
  GenderEnum,
  SelfieStatusEnum,
  SENSITIVE_USER_FIELDS,
  StatusEnum,
  WalletStatusEnum,
  type IUser,
} from "../common";

export interface IUserDocument extends IUser, Document {}

const FiatAccountSchema = new Schema(
  {
    accountNumber: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    provider: { type: String, trim: true, select: false },
    externalReference: { type: String, trim: true, select: false },
    externalId: { type: String, trim: true, select: false },
    rtpRoutingNumber: { type: String, trim: true },
    wireRoutingNumber: { type: String, trim: true },
    status: { type: String, trim: true },
    routing: { type: String, trim: true },
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
      status: {
        type: String,
        enum: Object.values(WalletStatusEnum),
        default: WalletStatusEnum.PENDING,
      },
      accounts: { type: [accountSchema], default: [] },
    },
    { _id: false },
  );

const FiatCurrencyWalletSchema = currencyWallet(FiatAccountSchema);
const CryptoCurrencyWalletSchema = currencyWallet(CryptoAccountSchema);

const WalletSchema = new Schema(
  {
    axleCoins: { type: Number, default: 0 },
    reward: { type: Number, default: 0 },
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
    sudo: { type: String, trim: true },
    vitalswap: {
      user: { type: String, trim: true },
      wallets: {
        USD: { type: String, trim: true },
        EUR: { type: String, trim: true },
        GBP: { type: String, trim: true },
      },
    },
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
    blockedReason: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

// `name` is the current tier and stays unset until the user meets a tier's
// targets. `services` is the set of distinct services the user has used, which
// is what the tier's `service` requirement counts.
const BadgeSchema = new Schema(
  {
    name: {
      type: String,
      enum: Object.values(BadgeEnum),
    },
    services: {
      type: [{ type: String, enum: Object.values(PurposeEnum) }],
      default: [],
      select: false,
    },
  },
  { _id: false },
);

const KycDetailSchema = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: String,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    selfie: {
      type: String,
    },
    country: {
      type: String,
    },
    idUrl: { type: String },
  },
  { _id: false },
);

const KycTypeSchema = new Schema(
  {
    completed: { type: Boolean, default: false },
    identifier: { type: String, trim: true, select: false, index: true },
    details: { type: KycDetailSchema, select: false },
  },
  { _id: false },
);

const AddressDetailsSchema = new Schema(
  {
    line1: {
      type: String,
      trim: true,
    },
    line2: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const AddressSchema = new Schema(
  {
    completed: { type: Boolean, default: false },
    details: AddressDetailsSchema,
  },
  { _id: false },
);

const SelfieSchema = new Schema(
  {
    completed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(SelfieStatusEnum),
      default: SelfieStatusEnum.NOT_SUBMITTED,
    },
    details: { file: String },
  },
  { _id: false },
);

const KycSchema = new Schema(
  {
    bvn: KycTypeSchema,
    passport: KycTypeSchema,
    nin: KycTypeSchema,
    address: AddressSchema,
    selfie: SelfieSchema,
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
    // Sequential row number (1, 2, 3...) assigned by the pre-save hook below
    rowNumber: { type: Number, unique: true, sparse: true, immutable: true },
    tag: { type: String, trim: true, unique: true, sparse: true },
    avatar: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    dialCode: { type: String, required: true, trim: true },
    referralCode: { type: String, trim: true, unique: true, sparse: true },
    opportunityScore: { type: Number, default: 0 },
    badge: { type: BadgeSchema, default: () => ({}) },
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
    kyc: KycSchema,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Automatic backstop: strip sensitive fields whenever a user *document* is
// serialized, driven by the same SENSITIVE_USER_FIELDS constant that
// deleteFields() and superQuery `hiddenFields` use. This covers document/
// toObject responses; lean() results and aggregation (superQuery) are plain
// objects that bypass this — those paths strip explicitly instead.
const hideSensitiveFields = (doc: any, ret: Record<string, any>) => {
  delete ret.__v;
  // chatIdentity isn't a schema path, so carry it over from the document
  if (doc?.chatIdentity !== undefined) ret.chatIdentity = doc.chatIdentity;
  return deleteFields(ret, SENSITIVE_USER_FIELDS);
};

// Badge checks count how many users a given user has referred
userSchema.index({ "referredBy.user": 1 });

const MAX_ROW_NUMBER_ATTEMPTS = 5;

// Next row number = highest existing + 1 (served by the unique rowNumber index).
export const getNextRowNumber = async (): Promise<number> => {
  const last = await User.findOne({ rowNumber: { $exists: true } })
    .sort({ rowNumber: -1 })
    .select("rowNumber")
    .lean();

  return (last?.rowNumber ?? 0) + 1;
};

export const isDuplicateRowNumberError = (error: any): boolean =>
  error?.code === 11000 && "rowNumber" in (error.keyPattern ?? {});

// Every new user gets the next row number when it is saved. Reading the max is
// not atomic, so two simultaneous signups can pick the same number: the unique
// index rejects the second insert and the error handler below retries it with
// a fresh number. Only create()/save() of a new document runs this; bulk writes
// bypass it.
userSchema.pre("save", async function () {
  if (this.isNew && this.rowNumber == null) {
    this.rowNumber = await getNextRowNumber();
  }
});

const rowNumberAttempts = new WeakMap<object, number>();

userSchema.post("save", async function (error: any, doc: any, next: any) {
  const attempts = (rowNumberAttempts.get(doc) ?? 0) + 1;

  if (
    !isDuplicateRowNumberError(error) ||
    !doc.isNew ||
    attempts >= MAX_ROW_NUMBER_ATTEMPTS
  ) {
    return next(error);
  }

  rowNumberAttempts.set(doc, attempts);
  doc.rowNumber = undefined;

  try {
    await doc.save();
    next();
  } catch (retryError) {
    next(retryError);
  }
});

// chatIdentity is derived from the id, never stored: attach it to every user
// that is saved or read so it shows up in responses.
const attachChatIdentity = (docs: any) => {
  if (!docs) return;

  for (const doc of Array.isArray(docs) ? docs : [docs]) {
    if (doc?._id) doc.chatIdentity = computeChatIdentity(doc._id);
  }
};

userSchema.post("save", (doc) => attachChatIdentity(doc));
userSchema.post(/^find/, (docs) => attachChatIdentity(docs));

userSchema.set("toJSON", { transform: hideSensitiveFields });
userSchema.set("toObject", { transform: hideSensitiveFields });

// The multicurrency sweep (generate-multicurrency job) polls for wallets still
// mid-provisioning. PROCESSING is a rare, transient state, so a partial index
// per non-NGN currency keeps each index tiny and matches only the sweep's
// target set instead of the mostly-PENDING/GENERATED population.
for (const currency of [
  FiatCurrencyEnum.USD,
  FiatCurrencyEnum.GBP,
  FiatCurrencyEnum.EUR,
]) {
  userSchema.index(
    { [`wallet.fiat.${currency}.status`]: 1 },
    {
      partialFilterExpression: {
        [`wallet.fiat.${currency}.status`]: WalletStatusEnum.PROCESSING,
      },
    },
  );
}

export const User: Model<IUserDocument> = model<IUserDocument>(
  "User",
  userSchema,
);
