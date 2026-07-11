import { requestOtp, verifyOtp } from "@/controller";
import { Router } from "express";

const router = Router();

router.post("/request", requestOtp);
router.post("/verify", verifyOtp);

export { router as otpRouter };
