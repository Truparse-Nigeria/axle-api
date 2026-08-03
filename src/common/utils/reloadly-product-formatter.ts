import type {
  IContent,
  IReloadlyCachedProduct,
  IReloadlyUnstrippedProps,
} from "../interface";

export const refactorReloadlyProduct = (
  item: IContent,
  nairaRatePerUSD: number
): IReloadlyCachedProduct => {
  /**
   * Output of this function will look like:
   * {
   *    "productId": 10000,
   *    "productName": "sample item",
   *    "redeemInstructions": "steps to take",
   *    "country": "NG",
   *    "logoUrl": "https://logourl.com",
   *    "recipientCurrencyCode": "USD",
   *    "fixedRecipientDenominations": [
   *        {
   *            "USD": 20,
   *            "NGN": 20000
   *        }
   *    ],
   *    "senderFee": [
   *        1000
   *    ]
   * }
   */

  if (item.denominationType === "RANGE") {
    // We need to expand something like 20 - 50 into a range of multiple denominations
    const fixedRecipientDenominations = range({
      start: item.minRecipientDenomination as number,
      end: item.maxRecipientDenomination as number,
      minDenomination: item.minSenderDenomination as number,
      dollarExchangeRate: nairaRatePerUSD,
      recipientCurrency: item.recipientCurrencyCode,
    });

    /**
     * - senderFee is an array of how much to be paid as service fee.
     *   It maps directly to the array of payable denominations.
     *   Where there was previously a percentage, conversion is done.
     *   Output is rounded to 2 d.p, and converted to Number type
     */
    return {
      ...stripUnnecessaryProps(item),
      fixedRecipientDenominations,
      senderFee: fixedRecipientDenominations.map((denom) => {
        const amount = denom[item.recipientCurrencyCode] as number;
        return Number(
          (
            calculateNGN(item.senderFee, nairaRatePerUSD) +
            (item.senderFeePercentage / 100) *
              calculateNGN(amount, nairaRatePerUSD)
          ).toFixed(2)
        );
      }),
    };
  }

  // For fixed, a direct mapping to an array of objects is possible
  if (item.denominationType === "FIXED") {
    const fixedRecipientDenominations =
      item.fixedSenderDenominations && item.fixedRecipientDenominations
        ? item.fixedSenderDenominations.reduce(
            (acc, senderValue, index) => {
              const recipientValue = item.fixedRecipientDenominations[index];

              if (
                typeof recipientValue === "number" &&
                item.recipientCurrencyCode
              ) {
                acc.push({
                  [item.recipientCurrencyCode]: recipientValue,
                  NGN: calculateNGN(senderValue, nairaRatePerUSD),
                });
              }
              return acc;
            },
            [] as Array<Record<string, number>>
          )
        : [];

    /**
     * - senderFee is an array of how much to be paid as service fee.
     *   It maps directly to the array of payable denominations.
     *   Where there was previously a percentage, conversion is done.
     *   Output is rounded to 2 d.p, and converted to Number type
     */
    return {
      ...stripUnnecessaryProps(item),
      fixedRecipientDenominations,
      senderFee: fixedRecipientDenominations.map((_, index) => {
        return Number(
          (
            calculateNGN(item.senderFee, nairaRatePerUSD) +
            (item.senderFeePercentage / 100) *
              calculateNGN(
                item.fixedSenderDenominations?.[index] ?? 0,
                nairaRatePerUSD
              )
          ).toFixed(2)
        );
      }),
    };
  }
  return {
    ...stripUnnecessaryProps(item),
    fixedRecipientDenominations: [],
    senderFee: [],
  };
};

// Direct mappings from passed payload that require no mathematical conversions
const stripUnnecessaryProps = (item: IContent): IReloadlyUnstrippedProps => {
  return {
    productId: item.productId,
    productName: item.productName,
    redeemInstruction: item.redeemInstruction.verbose,
    logoUrl: item.logoUrls[0],
    country: item.country.isoName,
    recipientCurrencyCode: item.recipientCurrencyCode,
  };
};

const calculateNGN = (i: number, dollarExchangeRate: number) => {
  /**
   * Converts a USD amount to prevailing naira rate.
   */
  let denomination = Number((i * dollarExchangeRate).toFixed(2));
  return denomination;
};

const range = (data: {
  start?: number;
  end?: number;
  dollarExchangeRate: number;
  minDenomination?: number;
  recipientCurrency: string;
}) => {
  /**
   * Returns an array of objects that fall between (including) start and end,
   * provided that starting point is not lower than min denomination.
   * It returns the range in an object that contains recipient currency (e.g currency of product country)
   * and naira equivalent.
   */
  const { start, end, minDenomination, dollarExchangeRate, recipientCurrency } =
    data;

  const denominations = denominationRange(start as number, end as number);

  let result = [];

  for (let i of denominations) {
    let mainAmount = i;
    let total;

    if (minDenomination && start) {
      const base = minDenomination / start;
      mainAmount = base < 0 ? i : i * base;
      total = calculateNGN(mainAmount, dollarExchangeRate);
    } else {
      total = calculateNGN(i, dollarExchangeRate);
    }

    result.push({
      [recipientCurrency]: i,
      NGN: total,
    });
  }

  return result;
};

export const denominationRange = (start: number, end: number) => {
  /**
   * This function gets a range of numbers from start to end.
   * It generates an array from start and increments by 1 (+1) until the first multiple of 5.
   * On encountering the first multiple of 5, every subsequent number n is increased by 5, provided n < 5
   * Where end isn't a multiple of 5, the last number in output is the last multiple of 5 lower than end.
   * e.g
   *
   * denominationRange(1, 100) => [1,2,3,4,5,10,20, 25, 30...100]
   * denominationRange(1, 101) => [1,2,3,4,5,10,20, 25, 30...100]
   * denominationRange(1, 4) => [1,2,3,4]
   * denominationRange(7, 20) => [7,8,9,10,15,20]
   */
  end = Math.min(end, 100);
  const result = [];
  let current = start;

  while (current <= end) {
    result.push(current);

    if (current % 5 === 0 && current + 5 <= end) {
      current += 5;
    } else {
      current++;
    }
  }

  return result;
};
