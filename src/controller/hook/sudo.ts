import {
  ActivityEnum,
  AppError,
  FiatCurrencyEnum,
  generateRequestID,
  lockSession,
  logger,
  PurposeEnum,
  sendResponse,
  StatusEnum,
  SudoAuthCode,
  TxnDesc,
  VendorEnum,
  type ISudoAuthorizationCodeHook,
  type ISudoAuthorizationRequestHook,
  type ISudoAuthorizationRes,
  type ISudoHook,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction, User } from "@/model";
import { createJob } from "@/queue";
import type { Response } from "express";
import mongoose, { sanitizeFilter } from "mongoose";

// Sudo only reads `data.responseCode`: "00" approves, anything else declines
const respond = (res: Response, responseCode: string) => {
  const statusCode = responseCode === SudoAuthCode.APPROVED ? 200 : 400;
  const body: ISudoAuthorizationRes = { statusCode, data: { responseCode } };

  return res.status(statusCode).json(body);
};

export const sudoHook = catchAsync(async (req, res) => {
  const payload = sanitizeFilter(req.body) as ISudoHook;

  // Approve/decline a card authorization. The wallet is charged up front
  // (amount + fee + vat) and the txn stays PROCESSING until the settlement
  // events confirm or reverse it.
  const authorizationRequest = async (payload: ISudoAuthorizationRequestHook) => {
    const { card, customer, pendingRequest, merchant, transactionMetadata } =
      payload.data.object;
    const object = payload.data.object;
    const currency = FiatCurrencyEnum.NGN;

    if (!customer?._id || !card?._id || !pendingRequest?._id) {
      return respond(res, SudoAuthCode.INVALID_CARD);
    }

    if (card.status !== "active") {
      return respond(res, SudoAuthCode.RESTRICTED_CARD);
    }

    if (object.currency !== currency || card.currency !== currency) {
      return respond(res, SudoAuthCode.NOT_PERMITTED);
    }

    const fee = object.fee ?? 0;
    const vat = object.vat ?? 0;
    const total = object.amount + fee + vat;

    if (!Number.isFinite(total) || total <= 0 || fee < 0 || vat < 0) {
      return respond(res, SudoAuthCode.INVALID_AMOUNT);
    }

    // One pending request must never charge twice, even if Sudo redelivers it
    const lockCount = await lockSession(`sudo_${pendingRequest._id}`);

    // Already charged (lock may have expired): replay the approval, don't recharge
    if (await Transaction.exists({
        "meta.pendingRequestId": pendingRequest._id,
      })) {
      return respond(res, SudoAuthCode.APPROVED);
    }

    // Another delivery is still being worked on
    if (lockCount > 1) {
      return respond(res, SudoAuthCode.SYSTEM_ERROR);
    }

    const reference = generateRequestID();
    const balanceField = `wallet.fiat.${currency}.balance`;

    const session = await mongoose.startSession();
    let outcome: string;

    try {
      outcome = await session.withTransaction(async () => {
        // Balance check and charge in a single atomic query
        const user = await User.findOneAndUpdate(
          {
            "identifier.sudo": customer._id,
            [balanceField]: { $gte: total },
          },
          { $inc: { [balanceField]: -total } },
          { new: true, session, projection: { [balanceField]: 1 } },
        );

        if (!user) {
          const exists = await User.exists({ "identifier.sudo": customer._id });

          return exists
            ? SudoAuthCode.INSUFFICIENT_FUNDS
            : SudoAuthCode.INVALID_CARD;
        }

        const finalBalance = user.wallet.fiat[currency]?.balance ?? 0;

        await Transaction.create(
          [
            {
              user: user._id,
              reference,
              amount: total,
              activity: ActivityEnum.DEBIT,
              sourceCurrency: currency,
              destinationCurrency: currency,
              exchangeRate: 1,
              description: TxnDesc.nairaCardSpend,
              provider: VendorEnum.SUDO,
              purpose: PurposeEnum.CARDS,
              status: StatusEnum.PROCESSING,
              settlement: 0,
              // Only what we need to reconcile; the full payload carries
              // customer PII and identity numbers.
              requestPayload: {
                authorizationId: object._id,
                pendingRequestId: pendingRequest._id,
                cardId: card._id,
                customerId: customer._id,
              },
              initialBalance: finalBalance + total,
              finalBalance,
              view: {
                reference,
                currency,
                maskedPan: card.maskedPan,
                merchantName: merchant?.name,
                merchantCategory: merchant?.category,
                merchantCity: merchant?.city,
                merchantCountry: merchant?.country,
                channel: transactionMetadata?.channel,
                amount: object.amount,
                fee,
                vat,
                total,
              },
              meta: {
                cardId: card._id,
                authorizationId: object._id,
                pendingRequestId: pendingRequest._id,
              },
            },
          ],
          { session },
        );

        return SudoAuthCode.APPROVED;
      });
    } catch (error: any) {
      logger.error(`Sudo authorization failed: ${error?.message}`);
      return respond(res, SudoAuthCode.SYSTEM_ERROR);
    } finally {
      await session.endSession();
    }

    return respond(res, outcome);
  };

  // Email the card's 2FA code to its owner. The code is never logged or stored.
  const authorizationCode = async (payload: ISudoAuthorizationCodeHook) => {
    const { code, card } = payload.data.object;
    const customerId = card?.customer?._id;

    if (!code || !card?._id || !customerId) {
      throw new AppError("Invalid authorization code payload", 400);
    }

    if (card.status !== "active") {
      throw new AppError("Card is not active", 400);
    }

    // Sudo may redeliver the event; only email the code once
    if ((await lockSession(`sudo_code_${payload._id}`)) > 1) {
      return sendResponse(res, 200, "Authorization code already sent");
    }

    const user = await User.findOne({ "identifier.sudo": customerId })
      .select("email firstName")
      .lean();

    if (!user?.email) throw new AppError("User not found", 400);

    createJob({
      type: "SEND_EMAIL",
      priority: 1,
      to: user.email,
      subject: "Card authorization code",
      template: `Hello ${user.firstName}, your authorization code is ${code} for your ${card.brand} card ending ${card.maskedPan.slice(-4)}. Do not share this code with anyone.`,
    });

    return sendResponse(res, 200, "Authorization code sent");
  };

  switch (payload.type) {
    case "authorization.request":
      return await authorizationRequest(
        payload as ISudoAuthorizationRequestHook,
      );
    case "authorization.code":
      return await authorizationCode(payload as ISudoAuthorizationCodeHook);
    default:
      // Acknowledge events we don't act on so Sudo doesn't keep retrying them
      return res.status(200).json({ success: true });
  }
});
