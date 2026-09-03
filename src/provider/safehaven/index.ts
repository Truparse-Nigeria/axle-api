import {
  AppError,
  getCache,
  HttpMethod,
  IS_DEVELOPMENT,
  setCache,
  type IBank,
  type ICreateSafeHavenAccountV2,
  type ISafeHavenBank,
  type ISafeHavenResponse,
  type ISafeHavenSubAccount,
  type ISafehavenTransferResponse,
} from "@/common";
import { callSafehaven } from "./connect.safehaven";

// Get all banks (cached)
export const safehavenBanks = async () => {
  const key = "BANKS:safehaven";
  const cachedBanks = await getCache<IBank[]>(key);

  if (cachedBanks) return { data: cachedBanks, error: null };

  const { data, error } = await callSafehaven<
    ISafeHavenResponse<ISafeHavenBank[]>
  >("/transfers/banks", HttpMethod.GET);

  if (error || !data) throw new AppError("Unable to get banks");

  const banks = data.data.map((bank) => ({
    bankCode: bank.bankCode,
    bankName: bank.name,
  }));

  await setCache<IBank[]>(key, banks);

  return { data: banks as IBank[], error: null };
};

// Query inbound transfer status
export const safehavenStatus = async (sessionId: string, isDynamic = false) => {
  const { data, error } = await callSafehaven<
    ISafeHavenResponse<ISafehavenTransferResponse>
  >(
    isDynamic ? `/virtual-accounts/status` : `/transfers/status`,
    HttpMethod.POST,
    {
      data: { sessionId },
    },
  );

  if (error || !data) return { error, data: null };

  return { data: data.data, error: null };
};

// Create a permanent (static) sub-account for a user
export const safehavenSubAccount = async (
  payload: ICreateSafeHavenAccountV2,
) => {
  const { data, error } = await callSafehaven<
    ISafeHavenResponse<ISafeHavenSubAccount>
  >(`/accounts/v2/subaccount`, HttpMethod.POST, { data: payload });

  if (error || !data) return { error };

  const { createdAt, currencyCode, accountNumber, accountName } = data.data;

  return {
    data: {
      createdOn: createdAt,
      currencyCode,
      bankCode: IS_DEVELOPMENT ? "999240" : "090286",
      bankName: "Safe Haven MFB",
      accountNumber,
      accountName,
    },
  };
};
