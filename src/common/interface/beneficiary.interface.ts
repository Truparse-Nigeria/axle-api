import type { Document, Types } from "mongoose";
import type { BeneficiaryEnum } from "../enum";
import type { IBaseJobType } from "./email.interface";

export interface IBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  amount?: number;
}

export interface IElectricityDetails {
  meterNumber: string;
  meterName: string;
  disco: string;
  meterType: "prepaid" | "postpaid";
  address: string;
  amount?: number;
}

export interface ITVDetails {
  smartcardNumber: string;
  entity: string;
  customerName: string;
  planId: string;
}

export type BeneficiaryDetails = IBankDetails | IElectricityDetails | ITVDetails;

export interface IBeneficiary extends Document {
  identifier: string;
  type: BeneficiaryEnum;
  createdBy: Types.ObjectId;
  details: BeneficiaryDetails;
  isDeleted: boolean;
}

// Saving a beneficiary in a background job
export interface ISaveBeneficiaryJob extends IBaseJobType {
  identifier: string;
  beneficiaryType: BeneficiaryEnum; // What would normally be "type" in IBeneficiary
  details: BeneficiaryDetails;
  createdBy: Types.ObjectId | string;
}

// Name enquiry result cached for the follow-up bank transfer
export interface IBeneficiaryCache extends IBankDetails {
  beneficiaryId: string;
  session: string | null;
}
