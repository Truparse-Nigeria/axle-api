import {
  ENVIRONMENT,
  HttpMethod,
  type ISudoCard,
  type ISudoRevealCardRes,
  type ISudoCreateCardReq,
  type ISudoCreateCustomerReq,
  type ISudoDigitizeCardRes,
  type ISudoUpdateCardPinReq,
  type ISudoUpdateCardReq,
  type ISudoCustomer,
} from "@/common";
import { callSudoApi } from "./connect.sudo";

export const sudoCreateCustomer = async (payload: ISudoCreateCustomerReq) => {
  const { data, error } = await callSudoApi<ISudoCustomer>(
    "/customers",
    HttpMethod.POST,
    { data: payload },
  );
  if (error || !data?.data) return { error };
  return { data: data.data };
};

// Returns the same shape as eversendCreateCard so the controller can persist
// the card the same way. Sudo's create response has no cardholder name and no
// PAN/CVV (those come from the vault via sudoRevealCard), so `cardName` is
// passed in and `cardDetails` is left out.
export const sudoCreateCard = async (
  payload: ISudoCreateCardReq,
  cardName: string,
) => {
  const { data, error } = await callSudoApi<ISudoCard>(
    "/cards",
    HttpMethod.POST,
    { data: payload },
  );
  if (error || !data?.data) return { error };

  const card = data.data;

  return {
    data: {
      cardName,
      externalCustomerId: card.customer,
      externalCardId: card._id,
      cardBrand: card.brand,
      balance: 0,
      expirationDate: `${card.expiryMonth}/${card.expiryYear}`,
      currency: card.currency,
      firstSix: card.maskedPan.slice(0, 6),
      lastFour: card.maskedPan.slice(-4),
    },
    meta: card,
  };
};

export const sudoDigitizeCard = async (cardId: string) => {
  const { data, error } = await callSudoApi<ISudoDigitizeCardRes>(
    `/cards/digitalize/${cardId}`,
    HttpMethod.PUT,
  );
  if (error || !data?.data) return { error };
  return { data: data.data };
};

export const sudoUpdateCard = async (
  cardId: string,
  payload: ISudoUpdateCardReq,
) => {
  const { data, error } = await callSudoApi<ISudoCard>(
    `/cards/${cardId}`,
    HttpMethod.PUT,
    { data: payload },
  );
  if (error || !data?.data) return { error };
  return { data: data.data };
};

// Served by the Sudo vault (separate host), so it overrides the base URL.
export const sudoRevealCard = async (cardId: string) => {
  const { data, error } = await callSudoApi<ISudoRevealCardRes>(
    `/cards/${cardId}`,
    HttpMethod.GET,
    { params: { reveal: true }, baseURL: ENVIRONMENT.SUDO.VAULT_URL },
  );
  if (error || !data?.data) return { error };
  return { data: data.data };
};

// The success response carries no `data`, only { statusCode, message }.
export const sudoUpdateCardPin = async (
  cardId: string,
  payload: ISudoUpdateCardPinReq,
) => {
  const { data, error } = await callSudoApi(
    `/cards/${cardId}/pin`,
    HttpMethod.PUT,
    { data: payload },
  );
  if (error || !data) return { error };
  return { data: { message: data.message } };
};
