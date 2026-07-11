import { resetPassword, signup } from "@/controller";
import { Router } from "express";

const router = Router();


router.post("/auth/signup", signup);
router.post("/auth/reset-password", resetPassword);

export { router as userRouter };