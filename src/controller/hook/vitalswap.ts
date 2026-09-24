import {
  AppError,
  checkForCurrencyBankAccount,
  MULTICURRENCY_FIATS,
  toFiatAccount,
  WalletStatusEnum,
  type IFiatAccount,
  type IVitalSwapCreatedVirtualBankAccountHook,
  type IVitalSwapHook,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";
import { vitalSwapGetCustomer } from "@/provider";
import { sanitizeFilter } from "mongoose";

export const vitalSwapHook = catchAsync(async (req, res) => {
  const payload = sanitizeFilter(req.body) as IVitalSwapHook;

  const virtualBankAccount = async (
    payload: IVitalSwapCreatedVirtualBankAccountHook,
  ) => {
    const user = await User.findOne({
      "identifier.vitalswap.user": payload.event_user_id,
    });

    if (!user) throw new AppError("User not found");

    const { data, error } = await vitalSwapGetCustomer(payload.event_user_id);

    if (error || !data) {
      throw new AppError("Unable to retrieve customer info", 400);
    }

    if (data.status?.toLowerCase() !== "active") {
      throw new AppError("Customer is not active", 400);
    }

    const processingCurrencies = MULTICURRENCY_FIATS.filter(
      (currency) =>
        user.wallet?.fiat?.[currency]?.status === WalletStatusEnum.PROCESSING,
    );

    const set: Record<string, WalletStatusEnum> = {};
    const push: Record<string, { $each: IFiatAccount[] }> = {};

    for (const currency of processingCurrencies) {
      const account = checkForCurrencyBankAccount(
        data.virtual_bank_accounts,
        currency,
      );
      if (!account) continue;

      set[`wallet.fiat.${currency}.status`] = WalletStatusEnum.GENERATED;
      push[`wallet.fiat.${currency}.accounts`] = {
        $each: [toFiatAccount(account)],
      };
    }

    console.log(set);
    console.log(push);

    if (!Object.keys(set).length) {
      throw new AppError("New SET object is empty", 400);
    }

    await User.findByIdAndUpdate(user._id, {
      $set: set,
      $push: push,
    });

    //TODO: Notify customer that account was created
  };

  switch (payload.event_name) {
    case "created_virtual_bank_account":
      return await virtualBankAccount(payload);
    default:
      throw new AppError("Invalid event type", 400);
  }
});
