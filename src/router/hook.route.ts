import { safehavenHook } from "@/controller";
import { Router } from "express";

const router = Router();

router.post("/safehaven", safehavenHook);

export { router as hookRouter };
