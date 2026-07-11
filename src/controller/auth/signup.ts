import {
  AppError,
  createHash,
  generateRandomCode,
  sendResponse,
  signupSchema,
  validateRequestPayload
} from "@/common";
import { catchAsync } from "@/middleware";
import { UserModel } from "@/model";

// Referral codes are checked against the db and backed by a unique
// index, so a code is never shared between users
const generateUniqueReferralCode = async (): Promise<string> => {
  let referralCode: string;

  do {
    referralCode = generateRandomCode(8);
  } while (await UserModel.exists({ referralCode }));

  return referralCode;
};

export const signup = catchAsync(async (req, res) => {
  const {
    firstName,
    lastName,
    middleName,
    phone,
    dialCode,
    email,
    gender,
    password: pwd,
    referredBy,
    messageToken,
  } = await validateRequestPayload(req.body, signupSchema);

  const existingUser = await UserModel.exists({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    throw new AppError("An account with this email or phone already exists", 409);
  }

  // referredBy comes in as the referrer's referral code
  let referrer = null;
  if (referredBy) {
    referrer = await UserModel.findOne({ referralCode: referredBy });

    if (!referrer) {
      throw new AppError("Hmm, that referral code doesn't exist!", 400);
    }
  }

  const referralCode = await generateUniqueReferralCode();

  const user = await UserModel.create({
    firstName,
    lastName,
    middleName,
    phone,
    dialCode,
    email,
    gender,
    password: await createHash(pwd),
    referralCode,
    messageToken,
    ...(referrer && { referredBy: { user: referrer._id } }),
  });

  const { password, ...createdUser } = user.toObject();

  sendResponse(res, 200, "Welcome aboard! Your account is ready", {
    user: createdUser,
  });
});
