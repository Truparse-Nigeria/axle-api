import { type IWalletToWallet } from "@/common";
import { User } from "@/model";

// Credit the recipient (resolved by tag) in-house. Runs inside the sender's
// session so the debit and credit commit or roll back together.
export const axleWalletReceive = async ({
  recipientTag,
  amount,
  currency,
  session,
}: IWalletToWallet) => {
  const absAmount = Math.abs(amount);
  const balanceField = `wallet.fiat.${currency}.balance`;

  // Match on tag only: wallet balances are schema defaults, so older users may
  // not have the path persisted yet — $inc creates it on first credit.
  const recipient = await User.findOneAndUpdate(
    {
      tag: recipientTag,
      isDeleted: { $ne: true },
    },
    {
      $inc: { [balanceField]: absAmount },
    },
    { new: true, session },
  );

  if (!recipient) {
    return {
      data: null,
      error: "Recipient not found",
    };
  }

  return {
    data: recipient,
    error: null,
  };
};
