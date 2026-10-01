import {
  ActivityEnum,
  AppError,
  billServiceCheck,
  chargeUser,
  currency as formatAmount,
  deleteCache,
  ENVIRONMENT,
  FiatCurrencyEnum,
  generateRequestID,
  getCache,
  lockUser,
  PurposeEnum,
  refundUser,
  runCheck,
  sendMoneyToBankSchema,
  sendResponse,
  ServiceCheck,
  StatusEnum,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
  type IBeneficiaryCache,
  type ITransactionPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction } from "@/model";
import { safehavenBankTransfer } from "@/provider";
import { createJob } from "@/queue";

export const sendMoneyToBank = catchAsync(async (req, res) => {
  const { amount, pin, beneficiaryId, narration } =
    await validateRequestPayload(req.body, sendMoneyToBankSchema);

  // Bank transfers are NGN only
  const currency = FiatCurrencyEnum.NGN;

  const user = req.user;
  if (!user) {
    throw new AppError("User not found");
  }

  // The beneficiary comes from a recent name enquiry
  const enquiryKey = `BANK_ENQUIRY:${user._id}_${beneficiaryId}`;
  const beneficiary = await getCache<IBeneficiaryCache>(enquiryKey);

  if (!beneficiary) {
    throw new AppError(
      "You took too long. Please choose beneficiary and try again",
    );
  }

  const { accountNumber, bankCode, bankName, accountName, session } =
    beneficiary;

  // Check if service is available
  const checkService = await billServiceCheck(
    "moneyTransfer",
    ServiceCheck.WALLET_TO_BANK,
  );

  if (!checkService) {
    throw new AppError("Service not available");
  }

  const transferFee = checkService.rate;
  const stampDuty =
    amount > (checkService.stamp?.above ?? 10_000)
      ? (checkService.stamp?.fee ?? 50)
      : 0;

  // Total amount (amount + transfer fee + stamp duty)
  const totalAmount = amount + transferFee + stampDuty;

  await runCheck({ user, amount: totalAmount, currency, pin });
  delete req.body.pin;

  // Lock user temporarily
  await lockUser(String(user._id));

  // Charge user
  const updatedUser = await chargeUser({ user, amount: totalAmount, currency });

  const balance = updatedUser.wallet.fiat[currency]?.balance || 0;

  const reference = generateRequestID();

  const txnPayload: ITransactionPayload = {
    user: user._id as unknown as string,
    reference,
    amount: totalAmount,
    activity: ActivityEnum.DEBIT,
    sourceCurrency: currency,
    destinationCurrency: currency,
    exchangeRate: 1,
    description: TxnDesc.wallet2Bank,
    provider: checkService.name.toLowerCase(),
    purpose: PurposeEnum.TRANSFER,
    status: StatusEnum.PROCESSING,
    settlement: 0,
    requestPayload: req.body,
    initialBalance: balance + totalAmount,
    finalBalance: balance,
    view: {
      reference,
      description: TxnDesc.wallet2Bank,
      recipientAccountNumber: accountNumber,
      recipientBankName: bankName,
      recipientName: accountName,
      narration,
      amount,
      transferFee,
      ...(stampDuty > 0 && { stampDuty }),
      total: totalAmount,
      currency,
    },
    meta: { ...req.meta },
  };

  let response = null;

  if (checkService.name.toLowerCase() === VendorEnum.SAFE_HAVEN.toLowerCase()) {
    response = await safehavenBankTransfer({
      sessionRef: session ?? undefined,
      bankCode,
      accountNumber,
      amount,
      narration: narration || `${user.firstName} ${user.lastName}`,
      reference,
    });
  }

  // The name enquiry session is single use
  await deleteCache(enquiryKey);

  if (!response || response.error || response.shouldRefund) {
    const shouldRefund = !response || response.shouldRefund;

    await Transaction.create({
      ...txnPayload,
      ...(shouldRefund && {
        status: StatusEnum.FAILED,
        finalBalance: balance + totalAmount,
      }),
      responsePayload: response ?? {},
    });

    if (shouldRefund) {
      // Return the money we already debited before bailing out
      await refundUser({ user, amount: totalAmount, currency });

      throw new AppError(
        "Oops! Transfer didn't go through. Let's give it another shot",
      );
    }

    // Ambiguous outcome — left as PROCESSING and settled by the Safehaven hook
    throw new AppError("Your bank transfer is being processed.");
  }

  await Transaction.create({
    ...txnPayload,
    // Stored so a reversal from the Safehaven hook can find this transaction
    sessionId: response.data?.sessionId,
    settlement: transferFee - (checkService.NIP ?? 0),
    status: StatusEnum.SUCCESS,
    responsePayload: response,
  });

  createJob({
    type: "SEND_EMAIL",
    priority: 1,
    to: user.email,
    subject: `${ENVIRONMENT.APP.NAME} - Bank Transfer`,
    template: `You've successfully sent ${currency} ${formatAmount(amount)} to ${accountName} (${bankName} - ${accountNumber}). Fee: ${currency} ${formatAmount(transferFee + stampDuty)}. Reference: ${reference}. Your new balance is ${currency} ${formatAmount(balance)}.`,
  });

  sendResponse(
    res,
    200,
    `Money transfer completed successfully`,
    txnPayload.view,
  );
});
