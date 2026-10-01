import { Schema, model, type Model } from "mongoose";
import {
  BeneficiaryEnum,
  type BeneficiaryDetails,
  type IBeneficiary,
} from "../common";

// Required "details" fields per beneficiary type
const requiredFieldsMap: Record<BeneficiaryEnum, string[]> = {
  [BeneficiaryEnum.BANK]: [
    "bankName",
    "accountNumber",
    "accountName",
    "bankCode",
  ],
  [BeneficiaryEnum.ELECTRICITY]: [
    "meterNumber",
    "disco",
    "meterType",
    "address",
  ],
  [BeneficiaryEnum.CABLE]: ["smartcardNumber", "entity", "customerName"],
};

const BeneficiarySchema = new Schema<IBeneficiary>(
  {
    identifier: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(BeneficiaryEnum),
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      select: false,
    },
    isDeleted: { type: Boolean, default: false, select: false },
    // Shape depends on "type" — see requiredFieldsMap
    details: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (val: BeneficiaryDetails) {
          const requiredFields = requiredFieldsMap[this.type as BeneficiaryEnum];
          return requiredFields?.every(
            (field) => val?.[field as keyof BeneficiaryDetails],
          );
        },
        message: (props) =>
          `Invalid or missing fields in 'details' for type '${props?.value?.type}'`,
      },
    },
  },
  { timestamps: true },
);

// Never return soft-deleted beneficiaries
BeneficiarySchema.pre(/^find/, function (this: any, next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

// Beneficiaries are soft-deleted only
// findByIdAndDelete runs through findOneAndDelete middleware
BeneficiarySchema.pre(
  ["deleteOne", "deleteMany", "findOneAndDelete"],
  { document: true, query: true },
  function (next) {
    next(new Error("Delete operation is not allowed."));
  },
);

BeneficiarySchema.index({ createdBy: 1, type: 1, identifier: 1 });

export const Beneficiary: Model<IBeneficiary> = model<IBeneficiary>(
  "Beneficiary",
  BeneficiarySchema,
);
