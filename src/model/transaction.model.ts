import {
  ActivityEnum,
  PurposeEnum,
  StatusEnum,
  VendorEnum,
  type ITransaction,
} from "../common";
import { Schema, model, type Model } from "mongoose";

const TransactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      unique: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    sourceCurrency: {
      type: String,
      required: true,
    },
    destinationCurrency: {
      type: String,
      required: true,
    },
    exchangeRate: {
      type: Number,
      required: true,
    },
    activity: {
      type: String,
      enum: Object.values(ActivityEnum),
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: Object.values(VendorEnum),
      required: true,
    },
    purpose: {
      type: String,
      enum: Object.values(PurposeEnum),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(StatusEnum),
      required: true,
    },
    settlement: {
      type: Schema.Types.Mixed,
      select: false,
    },
    requestPayload: {
      type: Schema.Types.Mixed,
      select: false,
    },
    responsePayload: {
      type: Schema.Types.Mixed,
      select: false,
    },
    view: {
      type: Schema.Types.Mixed,
      required: true,
    },
    initialBalance: {
      type: Number,
      required: true,
    },
    finalBalance: {
      type: Number,
      required: true,
    },
    meta: {
      type: Schema.Types.Mixed,
      select: false,
    },
  },
  { timestamps: true },
);

TransactionSchema.index({ user: 1 });
TransactionSchema.index({ user: 1, createdAt: 1, status: 1 });
TransactionSchema.index(
  { createdAt: 1, purpose: 1, user: 1 },
  { partialFilterExpression: { status: "SUCCESS" } },
);

export const Transaction: Model<ITransaction> = model<ITransaction>(
  "Transaction",
  TransactionSchema,
);
