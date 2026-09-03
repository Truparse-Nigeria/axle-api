import {
  ENVIRONMENT,
  FiatCurrencyEnum,
  generateRequestID,
  KycEnum,
  VendorEnum,
  type IBaseJobType,
  type IUser,
} from "@/common";
import { User } from "@/model";
import { safehavenSubAccount } from "@/provider";
import { createJob } from "@/queue";
import { format } from "date-fns";

export interface IProcessStaticAccount extends IBaseJobType {
  identifier: string;
  dob?: string;
  user: IUser & { _id: string };
}

export const processStaticAccount = async (
  data: Partial<IProcessStaticAccount>,
) => {
  const { identifier, user, dob } = data;
  const outputDob = format(new Date(dob!), "dd-MM-yyyy");

  const { phone, email, _id, kyc } = user!;

  const externalReference = generateRequestID();

  const response = await safehavenSubAccount({
    phoneNumber: kyc?.bvn?.details?.phoneNumber || phone,
    externalReference,
    emailAddress: email,
    autoSweep: true,
    identityType: KycEnum.BVN.toUpperCase(),
    autoSweepDetails: {
      schedule: "Instant",
      accountNumber: ENVIRONMENT.SAFEHAVEN.ACCOUNT_NUMBER!,
    },
    identityNumber: identifier!,
    dateOfBirth: String(outputDob),
    booleanMatch: true,
  });

  if (!response?.data || response?.error) return;

  const { accountName, accountNumber, bankName } = response.data;

  const updatedUser = await User.findOneAndUpdate(
    {
      _id,
      "wallet.fiat.NGN.accounts.bankName": { $ne: "Safe Haven MFB" },
    },
    {
      $push: {
        "wallet.fiat.NGN.accounts": {
          accountNumber,
          accountName,
          bankName,
          provider: VendorEnum.SAFE_HAVEN,
        },
      },
    },
    { new: true },
  );

  if (updatedUser) {
    createJob({
      type: "SEND_EMAIL",
      priority: 1,
      to: email,
      subject: "New NGN Bank Account",
      template: `Your Account details: \n Account Number: ${accountNumber} \n Account Name: ${accountName} \n Bank Name: ${bankName}`,
    });
  }
};
