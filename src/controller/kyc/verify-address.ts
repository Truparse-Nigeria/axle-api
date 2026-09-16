import {
  AppError,
  encryptData,
  kycAddressSchema,
  sendResponse,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";

export const verifyAddress = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found");
  const { line1, line2, state, city, country, postalCode } =
    await validateRequestPayload(req.body, kycAddressSchema);
  const updated = await User.findOneAndUpdate(
    { _id: user._id, "kyc.address.completed": { $ne: true } },
    {
      $set: {
        "kyc.address.completed": true,
        "kyc.address.details": {
          line1: encryptData(line1),
          line2: line2 ? encryptData(line2) : "",
          state,
          city,
          country,
          postalCode,
        },
      },
    },
    { new: true },
  );
  if (!updated) throw new AppError("Address already verified", 400);
  return sendResponse(res, 200, "Address verification successful");
});
