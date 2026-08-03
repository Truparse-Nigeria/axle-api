import { AccessTypeEnum } from "@/common";
import {
  buyCable,
  getSettings,
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
import { authGuard } from "@/middleware";
import { Router } from "express";

const router = Router();

const access = AccessTypeEnum.USER;

router.post("/auth/login", login(access));
router.post("/auth/signup", signup);
router.post("/auth/reset-passcode", resetPasscode(access));

router.get("/settings", getSettings(access));
router.get("/settings/refresh", refreshSettings);

// Bill payments
router.post("/bill/airtime", authGuard(access), purchaseAirtime);

// Cable (TV)
router.get("/bill/cable/plans/:entity", authGuard(access), retrievePlans);
router.post(
  "/bill/cable/validate-smartcard",
  authGuard(access),
  validateSmartcardNumber,
);
router.post("/bill/cable/purchase", authGuard(access), buyCable);

// Electricity
router.post(
  "/bill/electricity/validate-meter",
  authGuard(access),
  validateMeterNumber,
);
router.post("/bill/electricity/purchase", authGuard(access), purchaseElectricity);

// Giftcards
router.get("/giftcard/countries", authGuard(access), retrieveGiftcardCountries);
router.get("/giftcard/products", authGuard(access), retrieveGiftcardProducts);
router.get("/giftcard/categories", authGuard(access), retrieveGiftcardCategories);
router.post("/giftcard/order", authGuard(access), orderGiftcard);
router.get(
  "/giftcard/redeem/:transactionId",
  authGuard(access),
  redeemGiftcard,
);

export { router as userRouter };