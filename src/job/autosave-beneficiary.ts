import type { ISaveBeneficiaryJob } from "@/common";
import { Beneficiary } from "@/model";

// Upsert so the same beneficiary is never saved twice for a user
export const autosaveBeneficiary = async (data: ISaveBeneficiaryJob) => {
  return await Beneficiary.findOneAndUpdate(
    {
      type: data.beneficiaryType,
      createdBy: data.createdBy,
      identifier: data.identifier,
    },
    {
      $setOnInsert: {
        type: data.beneficiaryType,
        identifier: data.identifier,
        details: data.details,
        createdBy: data.createdBy,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
};
