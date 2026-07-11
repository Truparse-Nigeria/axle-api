export interface IStoredOtp {
  otp: string;
  context: string;
}

export interface IOtpFinalizer {
  email: string;
  context: string;
}
