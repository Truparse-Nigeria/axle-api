import {
  AppError,
  getCache,
  HttpMethod,
  IS_DEVELOPMENT,
  setCache,
  type IBank,
  type ICreateSafeHavenAccountV2,
  type INameEnquiry,
  type ISafeHavenBank,
  type ISafeHavenNameEnquiry,
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

// Resolve the account name for a bank account
export const safehavenNameEnquiry = async (payload: INameEnquiry) => {
  const { data, error } = await callSafehaven<
    ISafeHavenResponse<ISafeHavenNameEnquiry>
  >(`/transfers/name-enquiry`, HttpMethod.POST, { data: payload });

  if (error || !data?.data) return { error };

  // Bank list is cached, used to attach the bank name to the beneficiary
  const { data: banks } = await safehavenBanks();
  const bank = banks.find((bank) => bank.bankCode === data.data.bankCode);

  return {
    data: {
      accountNumber: data.data.accountNumber,
      accountName: data.data.accountName,
      session: data.data.sessionId,
      bankCode: data.data.bankCode,
      bankName: bank?.bankName ?? "",
    },
  };
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
