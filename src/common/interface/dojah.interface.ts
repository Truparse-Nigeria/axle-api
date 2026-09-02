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