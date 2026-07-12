import {
  AccessTypeEnum,
  AppError,
  createHash,
  deleteCache,
  getCache,
  getModel,
  resetPasscodeSchema,
  sendResponse,
  validateRequestPayload,
  type IOtpFinalizer,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";

export const resetPasscode = (accessType: AccessTypeEnum) =>  catchAsync(async (req, res) => {
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

  const updatedUser = await getModel(accessType).findOneAndUpdate(
    { email: checkFinalizer.email },
    { passcode: hashPasscode }
  );

  if (!updatedUser)
    throw new AppError("Passcode update failed, Kindly contact support");

  sendResponse(res, 200, "Done! Your passcode is now fresh and secure");
});
