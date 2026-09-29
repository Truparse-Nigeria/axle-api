import {
  AccessTypeEnum,
  AppError,
  changePasscodeSchema,
  createHash,
  getModel,
  passcodeCheck,
  sendResponse,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";

export const changePasscode = (accessType: AccessTypeEnum) =>
  catchAsync(async (req, res) => {
    const { passcode, oldPasscode } = await validateRequestPayload(
      req.body,
      changePasscodeSchema,
    );

    const user = req.user;

    if (!user) {
      throw new AppError("User not found");
    }

    await passcodeCheck(oldPasscode, user.passcode);

    if (oldPasscode === passcode) {
      throw new AppError("No repeats! Choose a different passcode.");
    }

    const hashPasscode = await createHash(passcode);

    await getModel(accessType).findByIdAndUpdate(user._id, {
      passcode: hashPasscode,
    });

    sendResponse(res, 200, "You're good to go! Passcode updated.");
  });
