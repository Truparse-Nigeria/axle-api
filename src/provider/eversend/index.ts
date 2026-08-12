import {
  encryptData,
  HttpMethod,
  type IEversendCardTransactionRes,
  type IEversendCardUserPayload,
  type IEversendCardUserRes,
  type IEversendCreateCardPayload,
  type IEversendCreateCardRes,
  type IEversendFundCardPayload,
  type IEversendWithdrawCardPayload,
} from "@/common";
import { callEversend } from "./connect.eversend";

export const eversendCreateCard = async (
  payload: IEversendCreateCardPayload,
) => {
  const { data, error } = await callEversend<IEversendCreateCardRes>(
    "/cards",
    HttpMethod.POST,
    {
      data: payload,
    },
  );

  if (error || !data) return { error };

  const card = data.data.card;

  const cardNumber = card.number;
  const expiryDate = card.expiration;
  const cvv = card.securityCode;

  // Sensitive PAN/CVV are stored encrypted at rest — never in plaintext.
  const secureCardDetails = encryptData(
    JSON.stringify({ cardNumber, expiryDate, cvv }),
  );

  return {
    data: {
      cardName: card.name,
      externalCustomerId: card.ownerId,
      externalCardId: card.id,
      cardBrand: card.brand,
      balance: card.amount,
      expirationDate: card.expiration,
      currency: card.currency,
      firstSix: card.mask.slice(0, 6),
      lastFour: card.mask.slice(-4),
      cardDetails: secureCardDetails,
      address: card.billingAddress,
    },
    meta: data.data,
  };
};

export const eversendCardUser = async (payload: IEversendCardUserPayload) => {
  const { data, error } = await callEversend<IEversendCardUserRes>(
    "/cards/user",
    HttpMethod.POST,
    {
      data: payload,
    },
  );

  if (error || !data) return { error };

  return { data: data.data };
};

// Fund a card (money moves from the platform into the card). Endpoint/payload
// follow the Eversend cards API — confirm against their docs if it changes.
export const eversendFundCard = async (payload: IEversendFundCardPayload) => {
  const { cardId, ...body } = payload;

  const { data, error } = await callEversend<IEversendCardTransactionRes>(
    `/cards/${cardId}/deposit`,
    HttpMethod.POST,
    {
      data: body,
    },
  );

  if (error || !data) return { error };

  return { data: { balance: data.data.card.amount }, meta: data.data };
};

// Withdraw from a card (money moves from the card back to the platform).
export const eversendWithdrawCard = async (
  payload: IEversendWithdrawCardPayload,
) => {
  const { cardId, ...body } = payload;

  const { data, error } = await callEversend<IEversendCardTransactionRes>(
    `/cards/${cardId}/withdraw`,
    HttpMethod.POST,
    {
      data: body,
    },
  );

  if (error || !data) return { error };

  return { data: { balance: data.data.card.amount }, meta: data.data };
};
