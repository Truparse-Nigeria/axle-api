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

  //Check for KYC
  if (!req.user?.kyc?.address?.completed) {
    throw new AppError(
      "You need to complete your address KYC before creating a wallet",
    );
  }

  if (!req.user?.kyc?.nin?.completed || !req.user?.kyc?.passport?.completed) {
    throw new AppError(
      "You need to complete your NIN or Passport KYC before creating a wallet",
    );
  }

  const user = req.user;
  if (!user) throw new AppError("User not found");

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

    // TODO: complete the vitalswap details
    const { data, error } = await vitalSwapCreateCustomer({
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone_number: user.dialCode + user.phone,
      password: "password",
      accept_terms: true,
      identity: {
        bvn: user?.kyc?.bvn?.identifier ?? undefined,
        nationality:
          user?.kyc?.bvn?.identifier || user?.kyc?.nin?.identifier
            ? "Nigerian"
            : user?.kyc?.passport?.details?.country || "",
        id_number: user?.kyc?.nin?.identifier ? "NIN" : "Passport",
        id_type: user?.kyc?.nin?.identifier
          ? decryptData(user?.kyc?.nin?.identifier)
          : decryptData(user?.kyc?.passport?.identifier!),
        date_of_birth: user?.kyc?.nin?.details?.dateOfBirth
          ? decryptData(user?.kyc?.nin?.details?.dateOfBirth)
          : decryptData(user?.kyc?.passport?.details?.dateOfBirth),
        id_image_url: "https://example.com/id.jpg",
        selfie_image_url: "https://example.com/id.jpg",
        state_of_residence: "Lagos",
        city: "string",
        country: "string",
        country_iso: "string",
        lga_of_residence: "string",
        postal_code: "string",
        address: "string",
        address_number: "string",
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
