import { AccessTypeEnum } from "@/common";
import {
  buyCable,
  cardRate,
  createCard,
  freezeCard,
  fundCard,
  getStateAndCity,
  lookupIdentity,
  uploadSelfie,
  verifyIdentity,
  verifyAddress,
  getSettings,
  getTransactions,
  getUserCard,
  login,
  orderGiftcard,
  purchaseAirtime,
  purchaseElectricity,
  purchaseEsim,
  redeemGiftcard,
  refreshSettings,
  resetPasscode,
  retrieveEsimCountries,
  retrieveEsimPackages,
  retrieveGiftcardCategories,
  retrieveGiftcardCountries,
  retrieveGiftcardProducts,
  retrievePlans,
  revealCard,
  signup,
  terminateCard,
  validateMeterNumber,
  validateSmartcardNumber,
  withdrawCard,
  createFiatAccount,
  currencySetup,
  sendMoneyToWallet,
  recipientValidator,
  changePasscode,
  retrieveBanks,
  enquireName,
  sendMoneyToBank,
  retrieveBeneficiaries,
  removeBeneficiary,
} from "@/controller";
import {
  changePin,
  createPin,
  createTag,
  currentUser,
  resetPin,
} from "@/controller/user";
import { authGuard } from "@/middleware";
import { Router } from "express";

const router = Router();

const access = AccessTypeEnum.USER;

router.post("/auth/login", login(access));
router.post("/auth/signup", signup);
router.post("/auth/reset-passcode", resetPasscode(access));

router.get("/settings", getSettings(access));
router.get("/settings/refresh", refreshSettings);

// Any route below this middleware will be protected
router.use(authGuard(access));

router.get("/me", currentUser(access));
router.patch("/create-pin", createPin);
router.patch("/create-tag", createTag);
router.post("/reset-pin", resetPin);
router.patch("/change-pin", changePin);
router.patch("/change-passcode", changePasscode(access));

// Bill payments
router.post("/bill/airtime", purchaseAirtime);

// Cable (TV)
router.get("/bill/cable/plans/:entity", retrievePlans);
router.post("/bill/cable/validate-smartcard", validateSmartcardNumber);
router.post("/bill/cable/purchase", buyCable);

// Electricity
router.post("/bill/electricity/validate-meter", validateMeterNumber);
router.post("/bill/electricity/purchase", purchaseElectricity);

// Giftcards
router.get("/giftcard/countries", retrieveGiftcardCountries);
router.get("/giftcard/products", retrieveGiftcardProducts);
router.get("/giftcard/categories", retrieveGiftcardCategories);
router.post("/giftcard/order", orderGiftcard);
router.get("/giftcard/redeem/:transactionId", redeemGiftcard);

// Cards
router.post("/card", createCard);
router.get("/card", getUserCard);
router.post("/card/fund", fundCard);
router.post("/card/withdraw", withdrawCard);
router.post("/card/reveal", revealCard);
router.patch("/card/freeze", freezeCard);
router.post("/card/terminate", terminateCard);
router.get("/card/rate/:variant", cardRate);

// eSIM
router.get("/esim/countries", retrieveEsimCountries);
router.get("/esim/packages/:countryId/:packageType", retrieveEsimPackages);
router.post("/esim/purchase", purchaseEsim);

// KYC
router.get("/kyc", lookupIdentity);
router.post("/kyc", verifyIdentity);
router.post("/kyc/address", verifyAddress);
router.get("/kyc/state-and-city", getStateAndCity);
router.post("/kyc/selfie", uploadSelfie);

// Transactions
router.post("/transactions", getTransactions(access));

// Multi currency
router.get("/wallet/currency/setup/:currency", currencySetup);
router.get("/wallet/currency/account/:currency", createFiatAccount);

// Money transfer
router.post("/transfer/wallet", sendMoneyToWallet);
router.post("/money-transfer/wallet/enquiry", recipientValidator);
router.get("/money-transfer/banks", retrieveBanks);
router.post("/money-transfer/bank/enquiry", enquireName);
router.post("/money-transfer/bank", sendMoneyToBank);

// Beneficiaries
router.post("/beneficiary/retrieve", retrieveBeneficiaries);
router.delete("/beneficiary/:id", removeBeneficiary);

export { router as userRouter };
