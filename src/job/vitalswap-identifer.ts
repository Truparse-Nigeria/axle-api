import { FiatCurrencyEnum, type IBaseJobType } from "@/common";
import { User } from "@/model";
import { vitalSwapGetCustomer } from "@/provider";

export interface IVitalSwapIdentifer extends IBaseJobType {
  vitalSwapUserId: string;
}

const MULTICURRENCY_FIATS = [
  FiatCurrencyEnum.USD,
  FiatCurrencyEnum.GBP,
  FiatCurrencyEnum.EUR,
] as const;

export const vitalSwapIdentifer = async (payload: IVitalSwapIdentifer) => {
  const { vitalSwapUserId } = payload;

  if (vitalSwapUserId) return;

  const { data, error } = await vitalSwapGetCustomer(vitalSwapUserId);

  if (error || !data) return { error };

  const set: Record<string, string> = {};

  for (let fiat of MULTICURRENCY_FIATS) {
    set[`identifier.vitalswap.wallets.${fiat}`] = data.wallets.find(
      (wallet) => wallet.currency === fiat,
    )?.wallet_id!;
  }

  await User.findOneAndUpdate(
    { "identifier.vitalswap.user": vitalSwapUserId },
    { $set: set },
  );
};
