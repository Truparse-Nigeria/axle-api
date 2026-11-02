import {
  ActivityEnum,
  AppError,
  deleteFields,
  FiatCurrencyEnum,
  generateRequestID,
  pinCheck,
  PurposeEnum,
  rewardTransferSchema,
  sendResponse,
  SENSITIVE_USER_FIELDS,
  StatusEnum,
  TxnDesc,
  validateRequestPayload,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction, User } from "@/model";
import mongoose from "mongoose";

// Moves the user's whole reward balance into their NGN wallet
export const rewardTransfer = catchAsync(async (req, res) => {
  const { pin } = await validateRequestPayload(req.body, rewardTransferSchema);

  const user = req.user;
  if (!user) throw new AppError("User not found");

  await pinCheck(pin, user.pin, String(user._id));

  const reward = user.wallet?.reward ?? 0;
  if (reward <= 0) throw new AppError("No reward to transfer");

  const currency = FiatCurrencyEnum.NGN;
  const initialBalance = user.wallet.fiat?.[currency]?.balance ?? 0;

  const session = await mongoose.startSession();

  try {
    const updatedUser = await session.withTransaction(async () => {
      // Matching on the reward we read makes a concurrent/duplicate request a no-op
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, "wallet.reward": reward },
        [
          {
            $set: {
              [`wallet.fiat.${currency}.balance`]: {
                $add: [`$wallet.fiat.${currency}.balance`, "$wallet.reward"],
              },
              "wallet.reward": 0,
            },
          },
        ],
        { new: true, session },
      );

      if (!updatedUser) {
        throw new AppError("Could not complete transfer at the moment");
      }

      const reference = generateRequestID();

      await Transaction.create(
        [
          {
            user: user._id,
            reference,
            amount: reward,
            sourceCurrency: currency,
            destinationCurrency: currency,
            exchangeRate: 1,
            description: TxnDesc.rewardTransfer,
            activity: ActivityEnum.CREDIT,
            provider: VendorEnum.AXLE,
            purpose: PurposeEnum.REFER_AND_EARN,
            status: StatusEnum.SUCCESS,
            settlement: 0,
            initialBalance,
            finalBalance: updatedUser.wallet.fiat?.[currency]?.balance ?? 0,
            view: {
              reference,
              description: TxnDesc.rewardTransfer,
              amount: reward,
            },
          },
        ],
        { session, ordered: true },
      );

      return updatedUser;
    });

    return sendResponse(
      res,
      200,
      "Reward transferred successfully",
      deleteFields(updatedUser, SENSITIVE_USER_FIELDS),
    );
  } finally {
    await session.endSession();
  }
});
