import { generateUploadUrl } from "@/controller";
import { Router } from "express";

const router = Router();
router.get("/generate-url", generateUploadUrl);
export { router as uploadRouter };
