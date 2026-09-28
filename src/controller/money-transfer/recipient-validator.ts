import {
  AppError,
  checkRecipientSchema,
  decrCache,
  incrCache,
  secondsUntilEndOfDay,
  sendResponse,
  validateRequestPayload
} from "@/common";
import { catchAsync } from "@/middleware";
import { User, type IUserDocument } from "@/model";

export const recipientValidator = catchAsync(async (req, res) => {
  const { recipientTag } = await validateRequestPayload(
    req.body,
    checkRecipientSchema
  );

  const user = req.user as IUserDocument;
  if (!user) {
    throw new AppError("User not found");
  }

  if (!user.tag) {
    throw new AppError("Set up your tag before sending money.", 400);
  }

  if (recipientTag === user.tag) {
    throw new AppError("You cannot send money to yourself", 400);
  }

  const enquiryKey = `ENQUIRY_ATTEMPT:${user._id}`;

  const attempts = await incrCache(enquiryKey, secondsUntilEndOfDay());

  // if (attempts > 5) {
  //   return sendResponse(
  //     res,
  //     400,
  //     "Wrong verification limit reach. Try again tomorrow!."
  //   );
  // }

  const getUser = await User.findOne({ tag: recipientTag });

  if (!getUser) {
    return sendResponse(res, 400, "Recipient not found");
  }

  await decrCache(enquiryKey);

  return sendResponse(res, 200, null, {
    firstName: getUser.firstName,
    lastName: getUser.lastName,
    tag: getUser.tag,
  });
});
