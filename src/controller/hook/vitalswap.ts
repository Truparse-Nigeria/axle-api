import { AppError } from "@/common";
import { catchAsync } from "@/middleware";
import { sanitizeFilter } from "mongoose";

export const vitalSwapHook = catchAsync(async (req, res) => {
  const payload = sanitizeFilter(req.body);

  const virtualBankAccount = () => {
    
  };

  switch (payload.event_name) {
    case "created_virtual_bank_account":
      return virtualBankAccount();
    default:
      throw new AppError("Invalid event type", 400);
  }
});
