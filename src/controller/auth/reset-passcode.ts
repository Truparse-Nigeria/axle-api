import {
  AppError,
  createHash,
  deleteCache,
  getCache,
  resetPasscodeSchema,
  sendResponse,
  validateRequestPayload,
  type IOtpFinalizer,
} from "@/common";
import { catchAsync } from "@/middleware";
import { UserModel } from "@/model";

export const resetPasscode = catchAsync(async (req, res) => {
  //Validate data
  const { finalizer, context, passcode } = await validateRequestPayload(
    req.body,
    resetPasscodeSchema
  );

  // User finalizer to check if the user is eligible to make this change
  const checkFinalizer = await getCache<IOtpFinalizer>(finalizer);
  deleteCache(finalizer);

  if (!checkFinalizer || checkFinalizer.context !== context) {
    throw new AppError("Too slow! Passcode change expired. Try again!", 400);
  }

  const hashPasscode = await createHash(passcode);

  const updatedUser = await UserModel.findOneAndUpdate(
    { email: checkFinalizer.email },
    { passcode: hashPasscode }
  );

  if (!updatedUser)
    throw new AppError("Passcode update failed, Kindly contact support");

  sendResponse(res, 200, "Done! Your passcode is now fresh and secure");
});
