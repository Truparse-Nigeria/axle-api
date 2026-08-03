import {
  getCache,
  HttpMethod,
  refactorReloadlyProduct,
  setCache,
  type IContent,
  type IReloadlyBalance,
  type IReloadlyCachedCategory,
  type IReloadlyCachedCountry,
  type IReloadlyCategory,
  type IReloadlyCountry,
  type IReloadlyGiftcardOrderPayload,
  type IReloadlyOrder,
  type IReloadlyProductRequestPayload,
  type IReloadlyProducts,
  type IReloadlyRedeemGiftcard,
} from "@/common";
import { callReloadly } from "./connect.reloadly";

export const reloadlyCountries = async () => {
  const key = "reloadly_countries";

  const countries = await getCache<IReloadlyCachedCountry[]>(key);
  if (countries) {
    return { data: countries };
  }

  const { data, error } = await callReloadly<IReloadlyCountry[]>(
    "/countries/",
    HttpMethod.GET,
  );

  if (error || !data) return { error };

  // Exclude flag url from payload
  const parsedData = data.map((rest) => ({
    countryName: rest.name,
    isoName: rest.isoName,
  }));

  await setCache<IReloadlyCachedCountry[]>(key, parsedData);
  return { data: parsedData };
};

export const reloadlyProducts = async (
  payload: IReloadlyProductRequestPayload,
  nairaRatePerUSD: number,
) => {
  const filteredPayload = removeUndefined(payload);

  const { data, error } = await callReloadly<IReloadlyProducts>(
    "/products",
    HttpMethod.GET,
    {
      params: filteredPayload,
    },
  );

  if (error || !data) return { error };

  const response = data.content.map((item) => {
    return refactorReloadlyProduct(item, nairaRatePerUSD);
  });

  const pagination = {
    total: data.totalElements,
    limit: data.size,
    currentPage: data.number,
  };

  return { data: { response, pagination } };
};

export const reloadlyCategories = async () => {
  const key = "reloadly_categories";

  const categories = await getCache<IReloadlyCachedCategory[]>(key);
  if (categories) {
    return { data: categories };
  }

  const { data, error } = await callReloadly<IReloadlyCategory[]>(
    "/product-categories",
    HttpMethod.GET,
  );

  if (error || !data) return { error };

  // Convert response to our own defined key names
  const content = data.map((item) => ({
    categoryName: item.name,
    categoryId: item.id,
  }));

  await setCache<IReloadlyCachedCategory[]>(key, content, 30 * 24 * 60 * 60); // Cache for 30 days
  return { data: content };
};

export const orderReloadlyGiftcard = async (
  payload: IReloadlyGiftcardOrderPayload,
) => {
  const { data, error } = await callReloadly<IReloadlyOrder>(
    "/orders",
    HttpMethod.POST,
    {
      data: payload,
    },
  );

  if (error || !data) return { error };

  if (data.status === "FAILED")
    return {
      error: data,
    };

  const content = {
    transactionId: data.transactionId,
    amountBilled: data.amount,
  };

  return { data: content, meta: data };
};

// Optional fields will be passed as undefined
const removeUndefined = (obj: Record<string, any>): Record<string, any> => {
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
};

export const reloadlyRedeemGiftcard = async (transactionId: string) => {
  const { data, error } = await callReloadly<IReloadlyRedeemGiftcard[]>(
    `/orders/transactions/${transactionId}/cards`,
    HttpMethod.GET,
  );

  if (error || !data) return { error };

  // Convert response to our own defined key names
  const content = data.map((item) => ({
    cardNumber: item.cardNumber,
    pin: item.pinCode,
  }));

  return { data: content };
};

export const reloadlyBalance = async () => {
  const { data, error } = await callReloadly<IReloadlyBalance>(
    "/accounts/balance",
    HttpMethod.GET,
  );

  if (error || !data) return { error };

  return { data: data.balance, error: null };
};

export const reloadlyProductById = async (
  id: string,
  nairaRatePerUSD: number,
) => {
  const { data, error } = await callReloadly<IContent>(
    `/products/${id}`,
    HttpMethod.GET,
  );
  if (error || !data) return { error };

  const response = refactorReloadlyProduct(data, nairaRatePerUSD);

  return { data: response };
};
