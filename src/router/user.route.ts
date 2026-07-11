import { login, resetPasscode, signup } from "@/controller";
import { Router } from "express";

const router = Router();


router.post("/auth/login", login);
router.post("/auth/signup", signup);
router.post("/auth/reset-passcode", resetPasscode);

export { router as userRouter };