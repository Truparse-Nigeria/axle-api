import { dojahHook, safehavenHook } from "@/controller";
import { Router } from "express";

const router = Router();

router.post("/safehaven", safehavenHook);
router.post("/dojah", dojahHook);


export { router as hookRouter };
