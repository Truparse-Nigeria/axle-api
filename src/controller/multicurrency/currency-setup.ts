import {
  AppError,
  checkConsent,
  checkMultiCurrencyService,
  currencySchema,
  decryptData,
  FiatCurrencyEnum,
  sendResponse,
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

const runWalletIDSetup = async (
  user: IUserDocument,
  currency: FiatCurrencyEnum,
) => {
  if (!user.identifier?.vitalswap?.wallets[currency]) {
    createJob({
      type: "VITALSWAP_WALLET",
      jobId: `VITALSWAP_WALLET_${user.identifier?.vitalswap?.user}`,
      vitalSwapUserId: user.identifier?.vitalswap?.user,
    });
  }
};

export const CurrencySetup = catchAsync(async (req, res) => {
  const { currency } = await validateRequestPayload(req.body, currencySchema);

  if (currency === FiatCurrencyEnum.NGN) {
    throw new AppError(
      `You are not allow to create ${currency} wallet at the moment`,
    );
  }

  const user = req.user;
  if (!user) throw new AppError("User not found");

  //Check for KYC
  if (!user?.kyc?.address?.completed) {
    throw new AppError(
      "You need to complete your address KYC before creating a wallet",
    );
  }

  if (!user?.kyc?.nin?.completed && !user?.kyc?.passport?.completed) {
    throw new AppError(
      "You need to complete your NIN or Passport KYC before creating a wallet",
    );
  }

  if (user.wallet.fiat[currency].accounts.length > 0) {
    throw new AppError("Currency already setup");
  }

  const checkService = await checkMultiCurrencyService(currency);

  if (!checkService) throw new AppError("Service not available");

  if (checkService.slug.toLowerCase() === VendorEnum.VITALSWAP.toLowerCase()) {
    // NOTE: Get vitalswap products just so that is fetched to cache before it is needed.
    await vitalSwapPayingAccountProducts();

    if (user.identifier?.vitalswap?.user) {
      await runWalletIDSetup(user, currency);
      const consent = await checkConsent(user.identifier.vitalswap.user);

      return sendResponse(res, 200, "Currency setup successful", {
        identifier: user.identifier?.vitalswap?.user,
        consent: consent.data,
      });
    }


    const identity = user.kyc.nin?.completed
      ? user.kyc.nin
      : user.kyc.passport;
    const address = user.kyc.address?.details;
    if (!identity?.identifier || !identity.details || !address) {
      throw new AppError("Complete identity and address KYC first", 400);
    }
    const { data, error } = await vitalSwapCreateCustomer({
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone_number: user.dialCode + user.phone,
      password: "password",
      accept_terms: true,
      identity: {
        bvn: user.kyc.bvn?.identifier
          ? decryptData(user.kyc.bvn.identifier)
          : undefined,
        nationality: user.kyc.nin?.completed ? "Nigerian" : identity?.details?.country || "",
        id_number: decryptData(identity.identifier),
        id_type: user.kyc.nin?.completed ? "NIN" : "Passport",
        date_of_birth: decryptData(identity.details.dateOfBirth),
        id_image_url: identity.details.image || "",
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

    await runWalletIDSetup(user, currency);
    const consent = await checkConsent(data.user_id);

    return sendResponse(res, 200, "Currency setup successful", {
      identifier: data.user_id,
      consent: consent.data,
    });
  }

  throw new AppError("Service not available at the moment");
});
