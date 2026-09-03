import { Transaction, User } from "@/model";
import { safehavenBanks, safehavenStatus } from "@/provider";
import type { Response } from "express";
import mongoose from "mongoose";
import { TxnDesc } from "../constant";
import {
  ActivityEnum,
  FiatCurrencyEnum,
  PurposeEnum,
  StatusEnum,
  VendorEnum,
} from "../enum";
import type {
  IProcessTransactionParams,
  ISafehavenTransferResponse,
} from "../interface";
import {
  AppError,
  currency,
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
