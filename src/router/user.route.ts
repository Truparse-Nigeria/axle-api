import { AccessTypeEnum } from "@/common";
import { login, resetPasscode, signup } from "@/controller";
import { Router } from "express";

const router = Router();

const access = AccessTypeEnum.USER;

router.post("/auth/login", login(access));
router.post("/auth/signup", signup);
router.post("/auth/reset-passcode", resetPasscode(access));

export { router as userRouter };