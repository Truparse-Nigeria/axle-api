import { AccessTypeEnum } from "@/common";
import {
  buyCable,
  getSettings,
  login,
  purchaseAirtime,
  refreshSettings,
  resetPasscode,
  retrievePlans,
  signup,
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

export { router as userRouter };