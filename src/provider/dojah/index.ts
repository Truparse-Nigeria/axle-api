import { HttpMethod, type IDojahBalance, type IDojahBVNDetails, type IDojahNINDetails } from "@/common";
import { callDojah } from "./connect.dojah";

export const dojahBVNLookup = async (bvn: string) => {
  const { data, error } = await callDojah<{ entity: IDojahBVNDetails }>("/kyc/bvn/full", HttpMethod.GET, { params: { bvn } });
  if (error || !data?.entity) return { error };
  const item = data.entity;
  return { data: {
    type: "bvn" as const,
    identifier: bvn,
    firstName: item.first_name || item.firstName,
    lastName: item.surname || item.last_name || item.lastName,
    dateOfBirth: item.dateOfBirth || item.date_of_birth,
    phoneNumber: item.mobile || item.phone || item.phone_number || item.phone_number1,
    alternativePhoneNumber: item.phone_number2,
    gender: item.gender,
    image: item.image,
    middleName: item.middle_name,
  } };
};

export const dojahNINLookup = async (nin: string) => {
  const { data, error } = await callDojah<{ entity: IDojahNINDetails }>("/kyc/nin/nin_slip", HttpMethod.GET, { params: { nin } });
  if (error || !data?.entity) return { error };
  const item = data.entity;
  return { data: {
    type: "nin" as const,
    identifier: nin,
    firstName: item.first_name || item.firstName,
    lastName: item.surname || item.last_name || item.lastName,
    dateOfBirth: item.dateOfBirth || item.date_of_birth,
    phoneNumber: item.mobile || item.phone || item.phone_number || item.phone_number1,
    image: item.photo,
    idUrl: item.nin_id,
    middleName: item.middle_name,
  } };
};

export const dojahBalance = async () => {
  const { data, error } = await callDojah<IDojahBalance>("/balance", HttpMethod.GET);
  if (error || !data) return { error };
  return { data: data.entity.wallet_balance, error: null };
};
