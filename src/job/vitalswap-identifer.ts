import { FiatCurrencyEnum, setVitalSwapWalletId, type IBaseJobType } from "@/common";
import { User } from "@/model";
import { vitalSwapGetCustomer } from "@/provider";

export interface IVitalSwapIdentifer extends IBaseJobType {
  vitalSwapUserId: string;
}

export const vitalSwapIdentifer = async (payload: IVitalSwapIdentifer) => {
  const { vitalSwapUserId } = payload;

  if (vitalSwapUserId) return;

  await setVitalSwapWalletId(vitalSwapUserId);
};
