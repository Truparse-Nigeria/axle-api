import {
  AppError,
  getCache,
  validateWithDojah
} from "@/common";
import { catchAsync } from "@/middleware";


export const verifyKyc = catchAsync(async (req, res) => {
  const { reference } = req.query as { reference: string };

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  const cachedRef = await getCache(`kyc_key_${user._id}`);

  if (!cachedRef || cachedRef !== reference) {
    throw new AppError("Invalid KYC reference", 400);
  }

  const updatedUser = await validateWithDojah({
    reference,
    user,
  })

  return res.status(200).json({
    success: true,
    message: "KYC Verification successful",
    data: updatedUser,
  });
});

