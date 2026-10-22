import { safehavenHook, sudoHook, vitalSwapHook } from "@/controller";
import { Router } from "express";

const router = Router();

router.post("/safehaven", safehavenHook);
router.post("/vitalswap", vitalSwapHook);
router.post("/sudo", sudoHook);


export { router as hookRouter };
