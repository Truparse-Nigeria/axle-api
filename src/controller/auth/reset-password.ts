import {
  AppError,
  createHash,
  deleteCache,
  getCache,
  resetPasswordSchema,
  sendResponse,
  validateRequestPayload,
  type IOtpFinalizer,
} from "@/common";
import { catchAsync } from "@/middleware";
import { UserModel } from "@/model";

export const resetPassword = catchAsync(async (req, res) => {
  //Validate data
  const { finalizer, context, password } = await validateRequestPayload(
    req.body,
    resetPasswordSchema
  );

  // User finalizer to check if the user is eligible to make this change
  const checkFinalizer = await getCache<IOtpFinalizer>(finalizer);
  deleteCache(finalizer);

  if (!checkFinalizer || checkFinalizer.context !== context) {
    throw new AppError("Too slow! Password change expired. Try again!", 400);
  }

  const hashPassword = await createHash(password);

  const updatedUser = await UserModel.findOneAndUpdate(
    { email: checkFinalizer.email },
    { password: hashPassword }
  );

  if (!updatedUser)
    throw new AppError("Password update failed, Kindly contact support");

  sendResponse(res, 200, "Done! Your password is now fresh and secure");
});
