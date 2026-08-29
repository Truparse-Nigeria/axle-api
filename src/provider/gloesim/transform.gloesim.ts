import type {
  IGloesimPackage,
  IGloesimPackageCountry,
  IGloesimPackageDetail,
  IGloesimPricing,
  IGloesimPurchase,
  INormalizedCountry,
  INormalizedPackage,
  INormalizedPackageDetail,
  INormalizedPrice,
  INormalizedPurchase,
  TAllowance,
  TThrottle,
} from "@/common";

// GloeSIM encodes "unlimited" as a negative sentinel rather than a flag:
//   - data uses -1
//   - sms  uses -1
//   - voice uses -0.0167 (i.e. -1/60, a "minute" that never runs out)
// Any negative quantity means unlimited, 0 means the allowance is absent, and a
// positive value is the real amount. Decoding here keeps sentinels out of the UI.
const decodeAllowance = (quantity: number, unit?: string): TAllowance => {
  if (quantity < 0) return { kind: "unlimited" };
  if (quantity === 0) return { kind: "none" };
  return unit ? { kind: "amount", value: quantity, unit } : { kind: "amount", value: quantity };
};

const pluralize = (value: number, unit: string) =>
  `${value} ${unit}${value === 1 ? "" : "s"}`;

const nairaDisplay = (amount: number) =>
  `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Turns the provider's raw USD price string into the price shown to the user,
// always in BOTH currencies. `markedUpUsd = usd * (1 + markup/100)` is the USD
// price the user sees; `ngn = markedUpUsd * rate` is that price in Naira.
const computePrice = (
  rawPrice: string | number,
  pricing: IGloesimPricing,
): INormalizedPrice => {
  // The API sends price as either a numeric string or a number — Number()
  // handles both; fall back to 0 if it is somehow unparseable.
  const parsed = Number(rawPrice);
  const baseUsd = Number.isFinite(parsed) ? parsed : 0;

  const markedUpUsd = Number((baseUsd * (1 + pricing.markup / 100)).toFixed(2));
  const naira = Number((markedUpUsd * pricing.rate).toFixed(2));

  return {
    usd: { amount: markedUpUsd, display: `$${markedUpUsd.toFixed(2)}` },
    ngn: { amount: naira, display: nairaDisplay(naira) },
    baseUsd,
  };
};

// Derives the real connectivity from the per-network coverage flags instead of
// trusting the package's stale `connectivity` string.
const deriveConnectivity = (countries: IGloesimPackageCountry[]): string[] => {
  const tech = { "2G": false, "3G": false, "4G": false, "5G": false };

  for (const country of countries) {
    for (const network of country.network_coverage ?? []) {
      if (network.two_g) tech["2G"] = true;
      if (network.three_g) tech["3G"] = true;
      if (network.four_G) tech["4G"] = true;
      if (network.five_G) tech["5G"] = true;
    }
  }

  return (Object.keys(tech) as (keyof typeof tech)[]).filter((t) => tech[t]);
};

const networkTech = (n: IGloesimPackageCountry["network_coverage"][number]): string[] => {
  const tech: string[] = [];
  if (n.two_g) tech.push("2G");
  if (n.three_g) tech.push("3G");
  if (n.four_G) tech.push("4G");
  if (n.five_G) tech.push("5G");
  return tech;
};

const mapCountries = (
  countries: IGloesimPackageCountry[] = [],
): INormalizedCountry[] =>
  countries.map((c) => ({
    id: c.id,
    name: c.name,
    flagUrl: c.image_url,
    networks: (c.network_coverage ?? []).map((n) => ({
      name: n.network_name,
      code: n.network_code,
      tech: networkTech(n),
    })),
  }));

const decodeThrottle = (pkg: {
  unthrottle_data?: string | null;
  throttle_speed?: string | null;
}): TThrottle => {
  if (pkg.unthrottle_data && pkg.throttle_speed) {
    return {
      throttled: true,
      fullSpeedUpTo: pkg.unthrottle_data,
      reducedSpeed: pkg.throttle_speed,
    };
  }
  return { throttled: false };
};

const decodeActivation = (
  description: string,
): INormalizedPackage["activation"] => {
  const desc = (description ?? "").toLowerCase();
  if (desc.includes("first byte")) {
    return { trigger: "first-byte", description };
  }
  if (desc.includes("install")) {
    return { trigger: "install", description };
  }
  return { trigger: "unknown", description };
};

// Pulls a bundled dialing prefix (e.g. "+33") out of the free-text other_info.
const extractBundledNumber = (otherInfo?: string): string | undefined => {
  if (!otherInfo) return undefined;
  const match = otherInfo.match(/\+\d{1,4}/);
  return match ? match[0] : undefined;
};

/**
 * Transforms a raw GloeSIM package into the normalized shape consumed by the
 * client. `pricing` marks up the USD price and converts it to Naira. Pass
 * `selectedCountryId` to flag packages whose coverage does not actually include
 * the country the user is shopping for.
 */
export const transformGloesimPackage = (
  pkg: IGloesimPackage,
  pricing: IGloesimPricing,
  selectedCountryId?: number,
): INormalizedPackage => {
  const data = decodeAllowance(pkg.data_quantity, pkg.data_unit);
  const voice = decodeAllowance(pkg.voice_quantity, pkg.voice_unit);
  const sms = decodeAllowance(pkg.sms_quantity, "SMS");

  const countries = mapCountries(pkg.countries ?? []);

  const notes: string[] = [];
  if (pkg.policy) notes.push(pkg.policy);

  const bundledNumber = extractBundledNumber(pkg.other_info);
  // Keep any other_info we couldn't parse into a structured field as a note.
  if (pkg.other_info) notes.push(pkg.other_info);

  const zones = pkg.zones ?? [];

  let coverageWarning: string | undefined;
  if (
    selectedCountryId !== undefined &&
    !(pkg.countries ?? []).some((c) => c.id === selectedCountryId)
  ) {
    coverageWarning = "Selected country is not covered by this package.";
  }

  return {
    id: pkg.id,
    rawName: pkg.name,
    packageType: pkg.package_type,

    price: computePrice(pkg.price, pricing),
    validity: {
      value: pkg.package_validity,
      unit: pkg.package_validity_unit,
      display: pluralize(pkg.package_validity, pkg.package_validity_unit),
    },

    data,
    voice,
    sms,

    hasVoiceOrSms: voice.kind !== "none" || sms.kind !== "none",
    isUnlimitedData: data.kind === "unlimited",

    throttle: decodeThrottle(pkg),

    renewable: pkg.can_renew === 1,
    network: pkg.network,
    activation: decodeActivation(pkg.activation_type_description),

    connectivity: deriveConnectivity(pkg.countries ?? []),

    countries,

    hasZones: zones.length > 0,
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      data: z.data,
      calls: z.calls,
      sms: z.sms,
      countries: z.countries ?? [],
    })),

    bundledNumber,
    coverageWarning,
    notes,
  };
};

export const transformGloesimPackages = (
  packages: IGloesimPackage[],
  pricing: IGloesimPricing,
  selectedCountryId?: number,
): INormalizedPackage[] =>
  packages.map((pkg) =>
    transformGloesimPackage(pkg, pricing, selectedCountryId),
  );

/**
 * Normalizes the package detail (requery) response. This endpoint returns a
 * leaner shape than the list — no package_type/throttle/activation — plus a
 * separate `romaing_countries` (API's spelling) list.
 */
export const transformGloesimPackageDetail = (
  detail: IGloesimPackageDetail,
  pricing: IGloesimPricing,
): INormalizedPackageDetail => {
  const data = decodeAllowance(detail.data_quantity, detail.data_unit);
  const voice = decodeAllowance(detail.voice_quantity, detail.voice_unit);
  const sms = decodeAllowance(detail.sms_quantity, "SMS");

  return {
    id: detail.id,
    rawName: detail.name,
    packageType: detail.package_type,
    network: detail.network,
    price: computePrice(detail.price, pricing),
    validity: {
      value: detail.package_validity,
      unit: detail.package_validity_unit,
      display: pluralize(detail.package_validity, detail.package_validity_unit),
    },
    data,
    voice,
    sms,
    hasVoiceOrSms: voice.kind !== "none" || sms.kind !== "none",
    isUnlimitedData: data.kind === "unlimited",
    throttle: decodeThrottle(detail),
    activation:
      detail.activation_type_description !== undefined
        ? decodeActivation(detail.activation_type_description)
        : undefined,
    // The detail endpoint sends a stale `connectivity` string; derive the real
    // set from per-network coverage instead (same as the list transformer).
    connectivity: deriveConnectivity(detail.countries ?? []),
    countries: mapCountries(detail.countries ?? []),
    roamingCountries: mapCountries(detail.romaing_countries ?? []),
  };
};

/**
 * Trims a raw purchase response down to what the client needs to render an
 * order + install the eSIM. The full raw payload should be returned alongside
 * this (under `meta`) so nothing is discarded.
 */
export const transformGloesimPurchase = (
  purchase: IGloesimPurchase,
): INormalizedPurchase => {
  const { sim } = purchase;

  const notes: string[] = [];
  if (sim?.policy) notes.push(sim.policy);

  return {
    id: purchase.id,
    packageName: purchase.package,
    status: purchase.status,
    activated: purchase.activated,
    activatedAt: purchase.date_activated,
    expiresAt: purchase.date_expiry,
    createdAt: purchase.date_created,

    data: {
      isUnlimited: purchase.unlimited,
      initial: purchase.unlimited
        ? null
        : {
            value: purchase.initial_data_quantity,
            unit: purchase.initial_data_unit,
          },
      remaining: purchase.unlimited
        ? null
        : {
            value: purchase.rem_data_quantity,
            unit: purchase.rem_data_unit,
          },
    },

    esim: {
      iccid: sim?.iccid,
      qrCodeText: sim?.qr_code_text,
      smdpAddress: sim?.smdp_address,
      matchingId: sim?.matching_id,
      iosInstallUrl: sim?.universal_link,
      androidInstallUrl: sim?.android_universal_link,
      redeemLink: sim?.redeem_link,
      applied: sim?.sim_applied,
      number: sim?.number ?? null,
      status: sim?.status,
    },

    renewable: sim?.can_renew ?? false,
    notes,
  };
};
