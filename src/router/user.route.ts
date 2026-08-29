import { AccessTypeEnum } from "@/common";
import {
  buyCable,
  cardRate,
  createCard,
  freezeCard,
  fundCard,
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
} from "@/controller";
import { createPin, currentUser } from "@/controller/user";
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

// Transactions
router.post("/transactions", getTransactions(access));

export { router as userRouter };
