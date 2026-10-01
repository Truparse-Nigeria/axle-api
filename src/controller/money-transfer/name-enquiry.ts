import {
  AppError,
  BeneficiaryEnum,
  billServiceCheck,
  enquiryNameSchema,
  sendResponse,
  ServiceCheck,
  setCache,
  validateRequestPayload,
  VendorEnum,
  type IBeneficiaryCache,
} from "@/common";
import { catchAsync } from "@/middleware";
import { safehavenNameEnquiry } from "@/provider";
import { createJob } from "@/queue";
import { Types } from "mongoose";

export const enquireName = catchAsync(async (req, res) => {
  const { accountNumber, bankCode, save } = await validateRequestPayload(
    req.body,
    enquiryNameSchema,
  );

  const user = req.user;
  if (!user) {
    throw new AppError("User not found");
  }

  const checkService = await billServiceCheck(
    "moneyTransfer",
    ServiceCheck.WALLET_TO_BANK,
  );

  if (!checkService) {
    throw new AppError("Service not available");
  }

  const response = await bankNameEnquiry(
    checkService.name,
    accountNumber,
    bankCode,
  );

  if (response?.error || !response?.data) {
    throw new AppError("Unable to perform name enquiry", 404);
  }

  // Only send the non-sensitive details back to the user
  const { session, ...rest } = response.data;

  const beneficiaryId = new Types.ObjectId().toString();

  // Cache for 5 minutes to be used by the follow-up transfer
  await setCache<IBeneficiaryCache>(
    `BANK_ENQUIRY:${user._id}_${beneficiaryId}`,
    { beneficiaryId, ...response.data },
    5 * 60,
  );

  if (save) {
    await createJob({
      type: "SAVE_BENEFICIARY",
      identifier: accountNumber,
      beneficiaryType: BeneficiaryEnum.BANK,
      details: rest,
      createdBy: String(user._id),
    });
  }

  return sendResponse(res, 200, null, { beneficiaryId, ...rest });
});

export const bankNameEnquiry = async (
  provider: string,
  accountNumber: string,
  bankCode: string,
) => {
  const vendor = provider.toLowerCase();

  if (vendor === VendorEnum.SAFE_HAVEN.toLowerCase()) {
    return await safehavenNameEnquiry({ accountNumber, bankCode });
  }

  return null;
};
