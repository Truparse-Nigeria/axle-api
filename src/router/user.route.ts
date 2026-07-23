import { AccessTypeEnum } from "@/common";
import {
  getSettings,
  login,
  purchaseAirtime,
  refreshSettings,
  resetPasscode,
  signup,
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

export { router as userRouter };