import { Transaction, User, type IUserDocument } from "@/model";
import { dojahVerification, safehavenBanks, safehavenStatus } from "@/provider";
import type { Response } from "express";
import mongoose from "mongoose";
import { TxnDesc } from "../constant";
import {
  ActivityEnum,
  FiatCurrencyEnum,
  KycEnum,
  KycStatusEnum,
  PurposeEnum,
  StatusEnum,
  VendorEnum,
} from "../enum";
import type {
  IKycDetailSchema,
  IProcessTransactionParams,
  ISafehavenTransferResponse,
  IUser,
} from "../interface";
import {
  AppError,
  currency,
  decryptData,
  encryptData,
  extractExternalReference,
  generateRequestID,
  lockSession,
  refundUser,
  sendResponse,
} from "../utils";
import { createJob } from "@/queue";

// Abstract all safehaven checks in hooks
export const SafehavenHookAbstract = async (
  payload: ISafehavenTransferResponse,
  res?: Response,
) => {
  // Validating the request against safehaven directly
  const checkStatus = await safehavenStatus(
    payload.sessionId,
    !!payload.externalReference,
  );

  if (checkStatus.error || !checkStatus.data) {
    throw new AppError("Invalid Inbound Transfer", 400);
  }

  const {
    status,
    responseCode,
    type,
    fees,
    vat,
    stampDuty,
    amount,
    externalReference,
    sessionId,
    debitAccountName,
    destinationInstitutionCode,
    debitAccountNumber,
    createdAt,
    narration,
    isReversed,
    creditAccountNumber,
  } = payload;

  // check if the transaction is reversed
  if (isReversed && status === "Reserved") {
    const session = await mongoose.startSession();
    const { updatedUser, findTxn } = await session.withTransaction(async () => {
      const findTxn = await Transaction.findOneAndUpdate(
        {
          sessionId,
          status: { $in: [StatusEnum.SUCCESS, StatusEnum.PROCESSING] },
        },
        {
          status: StatusEnum.REVERSAL,
        },
        { new: true, session },
      );

      if (!findTxn) {
        throw new AppError("Transaction not found", 400);
      }

      const user = await User.findById(findTxn.user);

      if (!user) {
        throw new AppError("User not found", 400);
      }

      const updatedUser = await refundUser({
        user,
        amount: findTxn.amount,
        currency: FiatCurrencyEnum.NGN,
        session,
      });

      return { updatedUser, findTxn };
    });

    await session.endSession();

    createJob({
      type: "SEND_EMAIL",
      to: updatedUser.email,
      subject: "Transaction Reversed",
      template: `Hello ${updatedUser.firstName}, your outbound transfer of ₦${currency(findTxn.amount)} has been reversed.`,
    });

    return sendResponse(
      res!,
      200,
      "Transaction reversed successfully",
      findTxn.view,
    );
  }

  // In virtual account there is no checkStatus?.type !== 'Inwards' but it exists in sub account
  if (status !== "Completed" && responseCode !== "00") {
    throw new AppError("Transaction not processed", 400);
  }

  // lock sessionID to guard against duplicate concurrent processing
  const lockSessionCount = await lockSession(sessionId);

  if (lockSessionCount > 1) {
    throw new AppError(
      "Your transaction is being processed. Please check again in a few seconds.",
      400,
    );
  }

  const charges = fees + vat + stampDuty;
  const fundedAmount = amount - charges;

  let reference = generateRequestID();
  let entityId: string;

  // check if sessionId already processed
  const sessionExists = await Transaction.exists({ sessionId });
  if (sessionExists) {
    throw new AppError("Transaction already exist", 400);
  }

  if (externalReference) {
    // This is for virtual account (dynamic)
    const splitRef = extractExternalReference(externalReference);

    if (!splitRef) {
      throw new AppError("Invalid Transaction Reference", 400);
    }

    entityId = splitRef.entityId;
    reference = splitRef.reference;
  } else {
    // This is for sub account (static)
    if (type !== "Inwards") {
      throw new AppError("Transaction is not inward", 400);
    }

    const checkUser = await User.findOne({
      "wallet.fiat.NGN.accounts.accountNumber": creditAccountNumber,
    });

    if (!checkUser) {
      throw new AppError("User with credit account not found", 400);
    }

    entityId = String(checkUser._id);
  }

  const { data, error } = await safehavenBanks();

  if (error || !data) {
    throw new AppError("Bank not found", 400);
  }

  const sourceBank = data.find(
    (bank) => bank.bankCode === destinationInstitutionCode,
  );

  const view = {
    sourceAccountName: debitAccountName,
    sourceAccountNumber: debitAccountNumber,
    sourceBankName: sourceBank?.bankName || "----",
    reference,
    description: TxnDesc.topUp,
    amount: fundedAmount,
    fees,
    vat,
    stampDuty,
    total: amount,
    date: createdAt,
    remark: narration,
  };

  return {
    view,
    reference,
    fundedAmount,
    entityId,
  };
};

// Abstract all txn and wallet top-up process in hooks
export const createTxnAndTopupAbstract = async ({
  userId,
  fundedAmount,
  reference,
  requestPayload,
  view,
  session,
}: IProcessTransactionParams) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found");
  }

  const updatedUser = await refundUser({
    user,
    amount: fundedAmount,
    currency: FiatCurrencyEnum.NGN,
    session,
  });

  const finalBalance = updatedUser.wallet.fiat[FiatCurrencyEnum.NGN].balance;

  const [createdTransaction] = await Transaction.create(
    [
      {
        user: userId,
        reference,
        sessionId: requestPayload.sessionId,
        amount: fundedAmount,
        activity: ActivityEnum.CREDIT,
        sourceCurrency: FiatCurrencyEnum.NGN,
        destinationCurrency: FiatCurrencyEnum.NGN,
        exchangeRate: 1,
        description: TxnDesc.topUp,
        provider: VendorEnum.SAFE_HAVEN,
        purpose: PurposeEnum.TRANSFER,
        status: StatusEnum.SUCCESS,
        settlement: 0,
        requestPayload,
        initialBalance: finalBalance - fundedAmount,
        finalBalance,
        view,
      },
    ],
    { session },
  );

  if (!createdTransaction) {
    throw new AppError("Transaction will be processed if valid.");
  }

  return { updatedUser, createdTransaction };
};

// DOJAH KYC ABSTRACT START
// Break a name into normalized, comparable word tokens.
const nameTokens = (value?: string): string[] =>
  (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

// All tokens (first + middle + last) present in a stored KYC detail record.
const storedNameTokens = (details?: IKycDetailSchema): Set<string> =>
  new Set([
    ...nameTokens(details?.firstName),
    ...nameTokens(details?.middleName),
    ...nameTokens(details?.lastName),
  ]);

// Decrypt a stored (encrypted) date of birth for comparison; never throws.
const safeDecryptDob = (value?: string): string => {
  if (!value) return "";
  try {
    return decryptData(value).trim();
  } catch {
    return "";
  }
};

// True when every token of `name` is present in `stored`.
const containedIn = (
  name: string | undefined,
  stored: Set<string>,
): boolean => {
  const tokens = nameTokens(name);
  return tokens.length > 0 && tokens.every((token) => stored.has(token));
};

// KYC types that carry identity details (address KYC holds a different shape).
const IDENTITY_KYC_TYPES = [
  KycEnum.BVN,
  KycEnum.NIN,
  KycEnum.PASSPORT,
  KycEnum.DRIVERS_LICENSE,
] as const;

const assertKycIdentityConsistency = (
  existingKyc: IUserDocument["kyc"] | undefined,
  newType: KycEnum,
  newDetails: IKycDetailSchema,
) => {
  if (!existingKyc) return;

  const newDob = safeDecryptDob(newDetails.dateOfBirth);

  for (const type of IDENTITY_KYC_TYPES) {
    if (type === newType) continue;

    const existing = existingKyc[type];
    if (!existing?.completed || !existing.details) continue;

    if (newDob && safeDecryptDob(existing.details.dateOfBirth) !== newDob) {
      throw new AppError(
        "KYC details do not match your previously verified identity (date of birth mismatch).",
        400,
      );
    }

    const stored = storedNameTokens(existing.details);
    const lastNameMatches = containedIn(newDetails.lastName, stored);
    const firstOrMiddleMatches =
      containedIn(newDetails.firstName, stored) ||
      containedIn(newDetails.middleName, stored);

    if (!lastNameMatches || !firstOrMiddleMatches) {
      throw new AppError(
        "KYC details do not match your previously verified identity (name mismatch).",
        400,
      );
    }
  }
};

export const validateWithDojah = async ({
  reference,
  user,
}: {
  reference: string;
  user: IUserDocument;
}) => {
  const response = await dojahVerification(reference);

  if (!response.data || response.error) {
    throw new AppError("KYC Verification failed. Try again");
  }

  const { identifier, type, details } = response.data.userDetails;

  if (user?.kyc?.[type as KycEnum]?.completed === KycStatusEnum.SUCCESS) {
    throw new AppError("KYC already completed");
  }

  const kycFieldMap: Record<KycEnum, string> = {
    [KycEnum.BVN]: "kyc.bvn",
    [KycEnum.DRIVERS_LICENSE]: "kyc.driversLicense",
    [KycEnum.PASSPORT]: "kyc.passport",
    [KycEnum.NIN]: "kyc.nin",
    [KycEnum.ADDRESS]: "kyc.address",
  };

  const kycType = type as KycEnum;
  const fieldToUpdate = kycFieldMap[kycType];

  if (!fieldToUpdate) {
    throw new AppError("Unsupported KYC verification type", 400);
  }

  const identifierAlreadyUsed = await User.exists({
    _id: { $ne: user._id },
    [`${fieldToUpdate}.identifier`]: identifier,
  });

  if (identifierAlreadyUsed) {
    throw new AppError(
      `This ${kycType} has already been used by another account`,
      409,
    );
  }

  const existingKyc = await User.findById(user._id).select(
    "+kyc.bvn.details +kyc.nin.details +kyc.passport.details +kyc.driversLicense.details",
  );

  if (type !== KycEnum.ADDRESS)
    assertKycIdentityConsistency(existingKyc?.kyc, type as KycEnum, details);

  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id, [`${fieldToUpdate}.completed`]: { $ne: true } },
    {
      $set: {
        [fieldToUpdate]: {
          completed: response.data?.status,
          reason: response.data?.reason,
          identifier,
          details,
        },
        ...((response.data.selfie ||
          response.data.userDetails?.details?.selfie) && {
          "kyc.selfie": {
            completed: response.data?.status,
            reason: response.data?.reason,
            details: {
              file: encryptData(
                response.data.selfie ||
                  response.data.userDetails?.details?.selfie ||
                  "",
              ),
            },
          },
        }),
      },
    },
    { new: true },
  );

  if (!updatedUser) {
    throw new AppError(
      "KYC verification failed or is already completed. Please try again or contact support.",
    );
  }

  // Provision a permanent NGN bank account once BVN is verified
  if (
    updatedUser?.kyc?.bvn?.completed &&
    type === KycEnum.BVN &&
    response.data?.status === KycStatusEnum.SUCCESS
  ) {
    createJob({
      type: "PROCESS_STATIC_ACCOUNT",
      identifier: decryptData(identifier),
      user: updatedUser.toJSON() as unknown as IUser & { _id: string },
      dob: decryptData(details.dateOfBirth),
    });
  }

  return updatedUser;
};
// DOJAH KYC ABSTRACT END
