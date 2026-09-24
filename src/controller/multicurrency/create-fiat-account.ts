import {
  validateRequestPayload,
  currencySchema,
  AppError,
  checkMultiCurrencyService,
  VendorEnum,
  checkConsent,
  FiatCurrencyEnum,
  FiatCurrencyCountryEnum,
  sendResponse,
  WalletStatusEnum,
  setVitalSwapWalletId,
  safeDecryptData,
  IS_DEVELOPMENT,
  testIdentity,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";
import {
  vitalSwapCreatePayingAccount,
  vitalSwapPayingAccountProducts,
} from "@/provider";

export const createFiatAccount = catchAsync(async (req, res) => {
  const { currency } = await validateRequestPayload(req.params, currencySchema);

  if (currency === FiatCurrencyEnum.NGN) {
    throw new AppError(
      `You are not allow to create ${currency} wallet at the moment`,
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
    if (!user.identifier?.vitalswap?.user) {
      throw new AppError(
        "Your have not completed your currency setup. Try again",
      );
    }

    // this just to check if the customer has signed the consent
    const consent = await checkConsent(user.identifier.vitalswap.user);

    if (!consent.data.signed) {
      throw new AppError(
        "Your account is still under review. You will be notified once it is done.",
      );
    }

    const products = await vitalSwapPayingAccountProducts();

    const product = products.data.find(
      (product) => product.currency === FiatCurrencyCountryEnum[currency],
    );

    if (!product) {
      throw new AppError(`Unable to create ${currency} account`, 400);
    }

    const walletId = user.identifier.vitalswap.wallets?.[currency];

    console.log("walletId checkert", walletId);

    if (!walletId) {
      const fullUser = await setVitalSwapWalletId(
        user.identifier.vitalswap.user,
      );

      if (!fullUser?.identifier?.vitalswap?.wallets?.[currency]) {
        throw new AppError(
          `Your ${currency} wallet is still being set up. Try again shortly or contact support.`,
        );
      }
    }

    console.log(
      `Creating ${currency} account for ${user.identifier.vitalswap.user}`,
      {
        wallet_id: walletId,
        product_id: product.product_id,
        ...(user?.kyc?.bvn?.identifier && {
          bvn: IS_DEVELOPMENT
            ? testIdentity()
            : safeDecryptData(user?.kyc?.bvn?.identifier),
        }),
      },
    );

    const { data, error } = await vitalSwapCreatePayingAccount({
      wallet_id: walletId,
      product_id: product.product_id,
      ...(user?.kyc?.bvn?.identifier && {
        bvn: IS_DEVELOPMENT
          ? testIdentity()
          : safeDecryptData(user?.kyc?.bvn?.identifier),
      }),
    });

    if (error || !data) {
      if (
        error?.errorDate?.errror
          .toLowerCase()
          .includes(
            `A ${currency} paying account is already pending for this customer. Wait for it to become ACTIVE before creating another.`.toLowerCase(),
          )
      ) {
        throw new AppError(
          `Your ${currency} account is still being processed. Try again shortly or contact support.`,
        );
      }

      throw new AppError(
        `Unable to create ${currency} account. Try again`,
        400,
      );
    }

    await User.findByIdAndUpdate(user._id, {
      $set: {
        [`wallet.fiat.${currency}.status`]: WalletStatusEnum.PROCESSING,
      },
    });

    return sendResponse(
      res,
      200,
      `Your ${currency} account is been processed and will be available shortly`,
    );
  }

  throw new AppError(`Unable to create ${currency} account`, 400);
});
