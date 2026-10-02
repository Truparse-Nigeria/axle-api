import { Schema, model, type Model } from "mongoose";
import { VendorEnum, type IDataPlan } from "../common";

const DataPlanSchema = new Schema<IDataPlan>(
  {
    provider: {
      type: String,
      enum: [VendorEnum.BLAAC],
      required: true,
    },
    planId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    extension: String,
    size: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ["MB", "GB", "TB"],
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    network: {
      type: String,
      enum: ["mtn", "glo", "airtel", "9mobile"],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    isPromo: {
      type: Boolean,
      default: true,
    },
    description: String,
  },
  {
    timestamps: true,
  },
);

export const DataPlan: Model<IDataPlan> = model<IDataPlan>(
  "DataPlan",
  DataPlanSchema,
);
