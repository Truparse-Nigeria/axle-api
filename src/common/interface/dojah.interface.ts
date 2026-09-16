import type { KycEnum } from "../enum";
export interface IBaseKYCDetails {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  surname?: string;
  middle_name?: string;
  gender?: string;
  date_of_birth?: string;
  dateOfBirth?: string;
  phone_number1?: string;
  phone_number?: string;
  mobile?: string;
  phone?: string;
}

export interface IDojahBVNDetails extends IBaseKYCDetails {
  bvn: string;
  image: string;
  phone_number2?: string;
}

export interface IDojahNINDetails extends IBaseKYCDetails {
  photo: string;
  nin_id?: string;
  email?: string;
}

export interface IDojahCachedDetails {
  type: KycEnum.BVN | KycEnum.NIN;
  identifier: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  image?: string;
  idUrl?: string;
  middleName?: string;
}

export interface IDojahBalance {
  error?: string;
  entity: { wallet_balance: string; transferable_balance: string };
}

export interface IDojahVerificationRes {
  metadata: any;
  data: any;
  id_url: string;
  back_url: string;
  message: string;
  reference_id: string;
  widget_id: string;
  verification_mode: string;
  verification_type: string;
  verification_value: string;
  verification_url: string;
  selfie_url: string;
  status: boolean;
  aml: {
    status: boolean;
  };
  verification_status: string;
}