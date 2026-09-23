import {
  FiatCurrencyCountryEnum,
  FiatCurrencyEnum,
  logger,
  MULTICURRENCY_FIATS,
  VendorEnum,
  WalletStatusEnum,
  type IBaseJobType,
  type IFiatAccount,
  type IVitalSwapVirtualBankAccount,
  type IVitalSwapWallet,
} from "@/common";
import { User } from "@/model";
import { vitalSwapGetCustomer } from "@/provider";

export interface IGenerateMultiCurrency extends IBaseJobType {}

// vitalswap tags a wallet/account either by ISO currency ("USD") or by the
// 2-letter country code ("US") depending on the endpoint, so match on both.
const matchesCurrency = (value: string | null, currency: FiatCurrencyEnum) => {
  if (!value) return false;
  const v = value.toUpperCase();
  return v === currency || v === FiatCurrencyCountryEnum[currency];
};

const findWalletForCurrency = (
  wallets: IVitalSwapWallet[] | undefined,
  currency: FiatCurrencyEnum,
) =>
  (wallets ?? []).find(
    (wallet) =>
      matchesCurrency(wallet.currency, currency) &&
      wallet.virtual_bank_accounts?.length > 0,
  );

const toFiatAccount = (
  account: IVitalSwapVirtualBankAccount,
): IFiatAccount => ({
  accountNumber: account.account_number,
  accountName: account.account_name,
  bankName: account.bank_name,
  provider: VendorEnum.VITALSWAP,
  externalReference: account.vendor_reference ?? undefined,
  rtpRoutingNumber: account.rtp_routing_number ?? undefined,
  wireRoutingNumber: account.wire_routing_number ?? undefined,
  status: account.status ?? undefined,
  routing: account.routing ?? undefined,
});

export const generateMultiCurrency = async () => {
  // (1) Any user with at least one non-NGN fiat wallet mid-provisioning and a
  // vitalswap customer id. Nothing to do otherwise.
  const users = await User.find({
    "identifier.vitalswap.user": { $exists: true, $ne: null },
    $or: MULTICURRENCY_FIATS.map((currency) => ({
      [`wallet.fiat.${currency}.status`]: WalletStatusEnum.PROCESSING,
    })),
  })
    .select("identifier.vitalswap.user wallet.fiat")
    .lean();

    console.log(users.length)

  if (!users.length) return;

  for (const user of users) {
    const customerId = user.identifier?.vitalswap?.user;
    if (!customerId) continue;

    // (2) Confirm the vitalswap customer is active before touching wallets.
    const { data, error } = await vitalSwapGetCustomer(customerId);

    console.log(data,error)

    if (error || !data) continue;
    if (data.status?.toLowerCase() !== "active") continue;

    // (3) Only touch currencies that are still PROCESSING for this user and now
    // have a funded/generated wallet on vitalswap.
    const processingCurrencies = MULTICURRENCY_FIATS.filter(
      (currency) =>
        user.wallet?.fiat?.[currency]?.status === WalletStatusEnum.PROCESSING,
    );

    const set: Record<string, WalletStatusEnum> = {};
    const push: Record<string, { $each: IFiatAccount[] }> = {};

    for (const currency of processingCurrencies) {
      const wallet = findWalletForCurrency(data.wallets, currency);
      if (!wallet) continue;

      set[`wallet.fiat.${currency}.status`] = WalletStatusEnum.GENERATED;
      push[`wallet.fiat.${currency}.accounts`] = {
        $each: wallet.virtual_bank_accounts.map(toFiatAccount),
      };
    }

    console.log(set)
    console.log(push)

    if (!Object.keys(set).length) continue;

    await User.findByIdAndUpdate(user._id, {
      $set: set,
      $push: push,
    });

    //TODO: Notify customer that account was created
  }
};
