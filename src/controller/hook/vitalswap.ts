import { catchAsync } from "@/middleware";
import { sanitizeFilter } from "mongoose";

export const vitalSwapHook = catchAsync(async (req, res) => {
  const payload = sanitizeFilter(req.body);
});

