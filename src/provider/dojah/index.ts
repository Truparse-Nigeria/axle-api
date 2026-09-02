import {
  AppError,
  encryptData,
  HttpMethod,
  IS_DEVELOPMENT,
  KycEnum,
  nationalityCode,
  type IDojahVerificationRes,
} from "@/common";
import { callDojah } from "./connect.dojah";
import { isAfter } from "date-fns";

export interface IKYCDetails {
  firstName: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  phoneNumber: string;
  image: string;
  country?: string;
  expiryDate?: string;
}

export const dojahVerification = async (reference: string) => {
  const { data, error } = await callDojah<{ entity: IDojahVerificationRes }>(
    "kyc/verification",
    HttpMethod.GET,
    {
      params: {
        reference_id: reference,
      },
    }
  );

  if (error || !data) return { error };

  let userDetails = {
    identifier: encryptData(data.entity.verification_value),
    type: "",
    details: {} as IKYCDetails,
  };

  if (data.entity.verification_type === "BVN") {
    const {
      first_name,
      last_name,
      middle_name,
      date_of_birth,
      phone_number1,
      phone_number2,
      phone_number,
      image_url,
    } = data.entity.data.government_data.data.bvn.entity;

    userDetails = {
      ...userDetails,
      type: KycEnum.BVN,
      details: {
        firstName: first_name,
        lastName: last_name,
        middleName: middle_name || "",
        dateOfBirth: encryptData(date_of_birth),
        phoneNumber: phone_number1 || phone_number2 || phone_number,
        image: image_url,
        country: "NG",
      },
    };
  }

  if (data.entity.verification_type === "NIN") {
    const {
      first_name,
      last_name,
      middle_name,
      date_of_birth,
      phone_number1,
      phone_number2,
      phone_number,
      image_url,
    } = data.entity.data.government_data.data.nin.entity;

    userDetails = {
      ...userDetails,
      type: KycEnum.NIN,
      details: {
        firstName: first_name,
        lastName: last_name,
        middleName: middle_name || "",
        dateOfBirth: encryptData(date_of_birth),
        phoneNumber: phone_number1 || phone_number2 || phone_number,
        image: image_url,
        country: "NG",
      },
    };
  }

  if (data.entity.verification_type === "DL_ID") {
    const {
      first_name,
      last_name,
      middle_name,
      date_of_birth,
      expiry_date,
      nationality,
    } = data.entity.data.id.data.id_data;

    const expiryDate = new Date(expiry_date);
    const today = new Date();

    // Check if today has passed the expiry date
    const hasExpired = isAfter(today, expiryDate) && !IS_DEVELOPMENT;

    if (hasExpired) {
      throw new AppError("Driver's license has expired");
    }

    userDetails = {
      ...userDetails,
      type: KycEnum.DRIVERS_LICENSE,
      details: {
        firstName: first_name,
        lastName: last_name,
        middleName: middle_name || "",
        dateOfBirth: encryptData(date_of_birth),
        phoneNumber: "",
        image: data.entity.data.id.data.id_url,
        expiryDate: expiry_date,
        country: nationalityCode[nationality as keyof typeof nationalityCode],
      },
    };
  }

  if (data.entity.verification_type === "PASSPORT_ID") {
    const {
      first_name,
      last_name,
      middle_name,
      date_of_birth,
      expiry_date,
      nationality,
    } = data.entity.data.id.data.id_data;

    const expiryDate = new Date(expiry_date);
    const today = new Date();

    // Check if today has passed the expiry date
    const hasExpired = isAfter(today, expiryDate) && !IS_DEVELOPMENT;

    if (hasExpired) {
      throw new AppError("Passport has expired");
    }

    userDetails = {
      ...userDetails,
      type: KycEnum.PASSPORT,
      details: {
        firstName: first_name,
        lastName: last_name,
        middleName: middle_name || "",
        dateOfBirth: encryptData(date_of_birth),
        phoneNumber: "",
        image: data.entity.data.id.data.id_url,
        country: nationalityCode[nationality as keyof typeof nationalityCode],
        expiryDate: expiry_date,
      },
    };
  }

  return { data: { userDetails, selfie: data.entity.selfie_url } };
};
