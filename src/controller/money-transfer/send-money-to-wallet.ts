import {
  type ITransactionPayload,
  ActivityEnum,
  AppError,
  billServiceCheck,
  chargeUser,
  runCheck,
  generateRequestID,
  lockUser,
  PurposeEnum,
  sendMoneyToWalletSchema,
  sendResponse,
  StatusEnum,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  ServiceCheck,
  ENVIRONMENT,
  currency as formatAmount,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction } from "@/model";
import { axleWalletReceive } from "@/provider";
import { createJob } from "@/queue";
import mongoose from "mongoose";

export const sendMoneyToWallet = catchAsync(async (req, res) => {
  const { amount, pin, recipientTag, currency } = await validateRequestPayload(
    req.body,
    sendMoneyToWalletSchema,
  );

  const user = req.user;
  if (!user) {
    throw new AppError("User not found");
  }

  // Sender must have a tag to send via tag
  if (!user.tag) {
    throw new AppError("Set up your tag before sending money.", 400);
  }

  // Check if service is available
  const checkService = await billServiceCheck(
    "moneyTransfer",
    ServiceCheck.WALLET_TO_WALLET,
  );

  if (!checkService) {
    throw new AppError("Service not available");
  }

  if (recipientTag === user.tag) {
    throw new AppError("You cannot send money to yourself");
  }

  await runCheck({ user, amount, currency, pin });
  delete req.body.pin;

  // Lock user temporarily
  await lockUser(String(user._id));

  const reference = generateRequestID();

  // Wrap txn in session so the debit and credit commit together
  const session = await mongoose.startSession();

  let to;
  try {
    ({ to } = await session.withTransaction(async () => {
      const chargedUser = await chargeUser({
        user,
        amount,
        currency,
        session,
      });

      const balance = chargedUser.wallet.fiat[currency]?.balance || 0;

      const txnPayload: ITransactionPayload = {
        user: user._id as unknown as string,
        reference,
        amount,
        activity: ActivityEnum.DEBIT,
        sourceCurrency: currency,
        destinationCurrency: currency,
        exchangeRate: 1,
        description: TxnDesc.wallet2Wallet,
        provider: checkService.name.toLowerCase(),
        purpose: PurposeEnum.TRANSFER,
        status: StatusEnum.PROCESSING,
        settlement: 0,
        requestPayload: req.body,
        initialBalance: balance + amount,
        finalBalance: balance + amount,
        view: {
          reference,
          from: user.tag,
          senderName: `${user.firstName} ${user.lastName}`,
          recipient: recipientTag,
          description: TxnDesc.wallet2Wallet,
          amount,
          currency,
        },
        meta: { ...req.meta },
      };

      let response = null;

      if (checkService.name.toLowerCase() === VendorEnum.AXLE.toLowerCase()) {
        response = await axleWalletReceive({
          recipientTag,
          amount,
          currency,
          session,
        });
      }

      if (response?.error || !response?.data) {
        throw new AppError(`Oh Snap! Money transfer failed`);
      }

      const recipient = response.data;
      const recipientBalance = recipient.wallet.fiat[currency]?.balance || 0;

      const view = {
        reference,
        from: user.tag,
        senderName: `${user.firstName} ${user.lastName}`,
        recipientTag,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        description: TxnDesc.wallet2Wallet,
        amount,
        currency,
      };

      // Txn for sender
      await Transaction.create(
        [
          {
            ...txnPayload,
            status: StatusEnum.SUCCESS,
            responsePayload: response,
            finalBalance: balance,
            view,
          },
        ],
        { session },
      );

      // Txn for recipient
      await Transaction.create(
        [
          {
            ...txnPayload,
            user: recipient._id,
            reference: generateRequestID(),
            activity: ActivityEnum.CREDIT,
            status: StatusEnum.SUCCESS,
            requestPayload: {},
            responsePayload: response,
            initialBalance: recipientBalance - amount,
            finalBalance: recipientBalance,
            view,
          },
        ],
        { session },
      );

      return {
        from: chargedUser,
        to: recipient,
      };
    }));
  } finally {
    await session.endSession();
  }

  const recipientName = `${to?.firstName} ${to?.lastName}`;
  const senderName = `${user.firstName} ${user.lastName}`;
  const formattedAmount = formatAmount(amount);

  // Fire emails in parallel
  await Promise.all([
    createJob({
      type: "SEND_EMAIL",
      priority: 1,
      to: user.email,
      subject: `${ENVIRONMENT.APP.NAME} - Wallet Transfer`,
      template: `You've successfully sent ${currency} ${formattedAmount} to ${recipientName}. Reference: ${reference}.`,
    }),

    to?.email &&
      createJob({
        type: "SEND_EMAIL",
        priority: 1,
        to: to.email,
        subject: `${ENVIRONMENT.APP.NAME} - Wallet Transfer`,
        template: `You've been credited ${currency} ${formattedAmount} from ${senderName}. Reference: ${reference}.`,
      }),
  ]);

  sendResponse(res, 200, `Money transferred successfully`, {
    amount,
    recipientTag,
  });
});
