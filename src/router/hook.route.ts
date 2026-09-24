import { safehavenHook, vitalSwapHook } from "@/controller";
import { Router } from "express";

const router = Router();

router.post("/safehaven", safehavenHook);
router.post("/vitalswap", vitalSwapHook);


export { router as hookRouter };
