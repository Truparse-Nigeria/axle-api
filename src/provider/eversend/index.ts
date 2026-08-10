import {
  encryptData,
  HttpMethod,
  type IEversendCardUserPayload,
  type IEversendCardUserRes,
  type IEversendCreateCardPayload,
  type IEversendCreateCardRes,
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
