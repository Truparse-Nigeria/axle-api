import {
  cacheKey,
  GloesimPackageTypeEnum,
  getCache,
  HttpMethod,
  setCache,
  type IGloesimCountry,
  type IGloesimPackage,
  type IGloesimPackageDetail,
  type IGloesimPricing,
  type IGloesimPurchase,
  type IGloesimPurchaseDataOnly,
  type IGloesimPurchaseDataVoiceSms,
} from "@/common";
import { callGloesim } from "./connect.gloesim";
import {
  transformGloesimPackageDetail,
  transformGloesimPackages,
  transformGloesimPurchase,
} from "./transform.gloesim";

export * from "./transform.gloesim";

const { GLOESIM_COUNTRY_KEY } = cacheKey;

// GloeSIM's country list is stable, so cache it to avoid hitting the dealer
// endpoint (and re-authenticating) on every request.
const GLOESIM_COUNTRY_TTL = 24 * 60 * 60; // 24 hours

export const gloesimCountry = async () => {
  const cached = await getCache<IGloesimCountry[]>(GLOESIM_COUNTRY_KEY);
  if (cached) {
    return { data: cached };
  }

  const { data, error } = await callGloesim<IGloesimCountry[]>(
    "/developer/dealer/packages/country",
    HttpMethod.GET,
  );

  if (error || !data) return { error };

  await setCache<IGloesimCountry[]>(
    GLOESIM_COUNTRY_KEY,
    data.data,
    GLOESIM_COUNTRY_TTL,
  );

  return { data: data.data };
};

export const gloesimPackagesByCountry = async (
  countryId: number,
  packageType: GloesimPackageTypeEnum,
  pricing: IGloesimPricing,
  page = 1,
) => {
  const { data, error } = await callGloesim<IGloesimPackage[]>(
    `/developer/dealer/packages/country/${countryId}/${packageType}`,
    HttpMethod.GET,
    { params: { page } },
  );

  if (error || !data) return { error };

  return {
    data: {
      meta: data.meta,
      packages: transformGloesimPackages(data.data, pricing, countryId),
    },
  };
};

export const gloesimPackageDetail = async (
  packageId: string,
  pricing: IGloesimPricing,
) => {
  const { data, error } = await callGloesim<IGloesimPackageDetail>(
    `/developer/dealer/package/detail/${packageId}`,
    HttpMethod.GET,
  );

  if (error || !data) return { error };

  return {
    data: transformGloesimPackageDetail(data.data, pricing),
    meta: data,
  };
};

export const gloesimPurchase = async (
  payload: IGloesimPurchaseDataVoiceSms | IGloesimPurchaseDataOnly,
) => {
  const { data, error } = await callGloesim<IGloesimPurchase>(
    "/developer/dealer/package/purchase",
    HttpMethod.POST,
    { data: payload },
  );

  if (error || !data) return { error };

  return {
    data: transformGloesimPurchase(data.data),
    meta: data,
  };
};
