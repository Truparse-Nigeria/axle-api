import {
  AccessTypeEnum,
  AppError,
  checkOnboarding,
  createHash,
  generateRandomCode,
  sendResponse,
  signupSchema,
  tokenPair,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";

// Referral codes are checked against the db and backed by a unique
// index, so a code is never shared between users
const generateUniqueReferralCode = async (): Promise<string> => {
  let referralCode: string;

  do {
    referralCode = generateRandomCode(8);
  } while (await User.exists({ referralCode }));

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
    passcode: rawPasscode,
    referredBy,
    messageToken,
  } = await validateRequestPayload(req.body, signupSchema);

  const existingUser = await User.exists({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email or phone already exists",
      409,
    );
  }

  // referredBy comes in as the referrer's referral code
  let referrer = null;
  if (referredBy) {
    referrer = await User.findOne({ referralCode: referredBy });

    if (!referrer) {
      throw new AppError("Hmm, that referral code doesn't exist!", 400);
    }
  }

  const referralCode = await generateUniqueReferralCode();

  const user = await User.create({
    firstName,
    lastName,
    middleName,
    phone,
    dialCode,
    email,
    gender,
    passcode: await createHash(rawPasscode),
    referralCode,
    messageToken,
    ...(referrer && { referredBy: { user: referrer._id } }),
  });

  // Log the new account in right away
  const jti = await tokenPair(req, res, { id: String(user._id) }, AccessTypeEnum.USER);

  await User.findByIdAndUpdate(user._id, { jti });

  // Pending onboarding steps (a new user always needs a PIN). The client uses
  // this to route the user after signup.
  const onboarding = checkOnboarding(user);

  sendResponse(res, 200, "Welcome aboard! Your account is ready", {
    user: user.toObject(),
    ...(onboarding.length > 0 && { onboarding }),
  });
});
