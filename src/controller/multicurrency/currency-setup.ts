import {
  AppError,
  checkConsent,
  checkMultiCurrencyService,
  currencySchema,
  decryptData,
  encryptData,
  FiatCurrencyEnum,
  IS_DEVELOPMENT,
  KycEnum,
  sendResponse,
  testBVN,
  validateRequestPayload,
  VendorEnum,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User, type IUserDocument } from "@/model";
import {
  vitalSwapCreateCustomer,
  vitalSwapPayingAccountProducts,
} from "@/provider";
import { createJob } from "@/queue";
import { format } from "date-fns";

const runWalletIDSetup = async (
  user: IUserDocument,
  currency: FiatCurrencyEnum,
  vitalSwapUserId: string,
) => {
  if (!user.identifier?.vitalswap?.wallets?.[currency]) {
    createJob({
      type: "VITALSWAP_WALLET",
      jobId: `VITALSWAP_WALLET_${vitalSwapUserId}`,
      vitalSwapUserId,
    });
  }
};

export const currencySetup = catchAsync(async (req, res) => {
  const { currency } = await validateRequestPayload(req.params, currencySchema);

  if (currency === FiatCurrencyEnum.NGN) {
    throw new AppError(
      `You are not allow to create ${currency} wallet using this process.`,
    );
  }

  const user = req.user;
  if (!user) throw new AppError("User not found");

  //Check for KYC
  const hasIdentityVerification =
    user.kyc?.nin?.completed || user.kyc?.passport?.completed;

  if (!hasIdentityVerification) {
    throw new AppError(
      "You cannot create a business without a verified NIN or Passport. Complete your personal KYC first or contact support for assistance.",
    );
  }

  // Other required KYC fields
  const requiredKyc = [KycEnum.ADDRESS, KycEnum.SELFIE];

  requiredKyc.forEach((field) => {
    if (!user.kyc?.[field]?.completed) {
      throw new AppError(
        `You cannot create a business without a verified ${field.toUpperCase()}. Complete your personal KYC first or contact support for assistance.`,
      );
    }
  });

  if (user.wallet.fiat[currency].accounts.length > 0) {
    throw new AppError("Currency already setup");
  }

  const checkService = await checkMultiCurrencyService(currency);

  if (!checkService) throw new AppError("Service not available");

  if (checkService.slug.toLowerCase() === VendorEnum.VITALSWAP.toLowerCase()) {
    // NOTE: Get vitalswap products just so that is fetched to cache before it is needed.
    await vitalSwapPayingAccountProducts();

    if (user.identifier?.vitalswap?.user) {
      await runWalletIDSetup(user, currency, user.identifier.vitalswap.user);
      const consent = await checkConsent(user.identifier.vitalswap.user);

      return sendResponse(res, 200, "Currency setup successful", {
        consent: consent.data,
      });
    }

    const identity = user.kyc?.nin?.completed
      ? user.kyc.nin
      : user.kyc.passport;
    const address = user.kyc?.address?.details;

    if (!identity?.identifier || !identity.details || !address) {
      throw new AppError("Complete identity and address KYC first", 400);
    }

    const emailSplit = user.email.split("@");
    const email = `${encryptData(emailSplit[0]!)}@${emailSplit[1]}`;

    const { data, error } = await vitalSwapCreateCustomer({
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone_number: user.dialCode + user.phone,
      password: "password",
      accept_terms: true,
      identity: {
        bvn: user.kyc.bvn?.identifier
          ? IS_DEVELOPMENT ? testBVN() : decryptData(user.kyc.bvn.identifier)
          : undefined,
        nationality: user.kyc.nin?.completed
          ? "Nigerian"
          : identity?.details?.country || "",
        id_number: decryptData(identity.identifier),
        id_type: user.kyc.nin?.completed
          ? "National Identification Number"
          : "Passport",
        date_of_birth: format(
          new Date(decryptData(identity.details.dateOfBirth)),
          "yyyy-MM-dd",
        ),
        id_image_url: identity.details?.image || identity.details?.idUrl || "",
        selfie_image_url: user.kyc.selfie?.details?.file || "",
        state_of_residence: address.state,
        city: address.city,
        country: address.country,
        country_iso: user.kyc.nin?.completed ? "NG" : address.country,
        lga_of_residence: address.city,
        postal_code: address.postalCode,
        address: decryptData(address.line1),
        address_number: decryptData(address.line1),
      },
    });

    if (error || !data) {
      throw new AppError("Unable to set up your profile. Try again");
    }

    await User.findByIdAndUpdate(user._id, {
      $set: { "identifier.vitalswap.user": data.user_id },
    });

    await runWalletIDSetup(user, currency, data.user_id);
    const consent = await checkConsent(data.user_id);

    return sendResponse(res, 200, "Currency setup successful", {
      consent: consent.data,
    });
  }

  throw new AppError("Service not available at the moment");
});
