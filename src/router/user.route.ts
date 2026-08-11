import { AccessTypeEnum } from "@/common";
import {
  buyCable,
  getSettings,
  getTransactions,
  login,
  orderGiftcard,
  purchaseAirtime,
  purchaseElectricity,
  redeemGiftcard,
  refreshSettings,
  resetPasscode,
  retrieveGiftcardCategories,
  retrieveGiftcardCountries,
  retrieveGiftcardProducts,
  retrievePlans,
  signup,
  validateMeterNumber,
  validateSmartcardNumber,
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
router.post("/pin", createPin(access));

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

// Transactions
router.post("/transactions", getTransactions(access));

export { router as userRouter };
