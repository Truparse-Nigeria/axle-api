import {
  AppError,
  getCache,
  HttpMethod,
  setCache,
  type IVitalSwapCreateCustomerPayload,
  type IVitalSwapCreateCustomerResponse,
  type IVitalSwapCreatePayingAccountPayload,
  type IVitalSwapCreatePayingAccountResponse,
  type IVitalSwapGetCustomerResponse,
  type IVitalSwapPayingAccountConsentResponse,
  type IVitalSwapPayingAccountProduct,
} from "@/common";
import { callVitalSwap } from "./connect.vitalswap";

export const vitalSwapCreateCustomer = async (
  payload: IVitalSwapCreateCustomerPayload,
) => {
  const { data, error } = await callVitalSwap<IVitalSwapCreateCustomerResponse>(
    "/v1/customers",
    HttpMethod.POST,
    { data: payload },
  );

  if (error || !data) return { error };

  if (!data.user_id) throw new AppError("Unable to complete setup", 400);

  return { data };
};

export const vitalSwapGetCustomer = async (customerId: string) => {
  const { data, error } = await callVitalSwap<IVitalSwapGetCustomerResponse>(
    `/v1/customers/${customerId}`,
    HttpMethod.GET,
  );

  if (error || !data) return { error };

  if (!data.record_id)
    throw new AppError("Unable to retrieve customer info", 400);

  return { data };
};

export const vitalSwapPayingAccountConsent = async (customerId: string) => {
  const { data, error } =
    await callVitalSwap<IVitalSwapPayingAccountConsentResponse>(
      "/v1/paying-accounts/consent",
      HttpMethod.GET,
      { params: { customer_id: customerId } },
    );

  if (error || !data) return { error };

  return { data };
};

export const vitalSwapPayingAccountProducts = async () => {
  const key = "vitalswap_paying_account_products";

  const products = await getCache<IVitalSwapPayingAccountProduct[]>(key);
  if (products) return { data: products };

  const { data, error } = await callVitalSwap<IVitalSwapPayingAccountProduct[]>(
    "/v1/paying-accounts/products",
    HttpMethod.GET,
  );

  console.log(error?.errorData?.details?.field_errors);

  if (error || !data) {
    throw new AppError("Unable to retrieve products", 400);
  }

  await setCache<IVitalSwapPayingAccountProduct[]>(
    key,
    data,
    30 * 24 * 60 * 60,
  );

  return { data };
};

export const vitalSwapCreatePayingAccount = async (
  payload: IVitalSwapCreatePayingAccountPayload,
) => {
  const { data, error } =
    await callVitalSwap<IVitalSwapCreatePayingAccountResponse>(
      "/v1/paying-accounts",
      HttpMethod.POST,
      { data: payload },
    );

  console.log("paying account", error?.errorData?.details?.field_errors);

  if (error || !data) return { error };

  if ("success" in data && data.success === false) {
    throw new AppError("Unable to create paying account", 400);
  }

  return { data };
};
