import {
  AppError,
  KycStatusEnum,
  validateWithDojah,
  type IDojahVerificationRes,
} from "@/common";
import { catchAsync } from "@/middleware";
import { User } from "@/model";
import { createJob } from "@/queue";
import { sanitizeFilter } from "mongoose";

export const dojahHook = catchAsync(async (req, res) => {
  console.log("dojah hook", req.body);
  const payload = sanitizeFilter(req.body) as IDojahVerificationRes;

  console.log(req.headers);

  const userId = payload.reference_id.split("_")[0];

  const user = await User.findById(userId).schemaLevelProjections(false);

  if (!user) {
    throw new AppError("User not found");
  }

  let type = null;
  switch (payload.verification_type.toUpperCase()) {
    case "BVN":
      type = "bvn";
      break;
    case "NIN":
      type = "nin";
      break;
    case "DL_ID":
      type = "driversLicense";
      break;
    case "PASSPORT_ID":
      type = "passport";
      break;
    default:
      throw new AppError("Invalid KYC type");
  }

  if (type && user.kyc?.[type as keyof typeof user.kyc]?.completed === KycStatusEnum.SUCCESS) {
    throw new AppError("KYC already completed");
  }

  await validateWithDojah({
    reference: payload.reference_id,
    user,
  });

  if (payload.verification_type.toLowerCase() !== "ongoing") {
    createJob({
      type: "SEND_EMAIL",
      priority: 1,
      to: user.email,
      subject: `${type.toUpperCase()} KYC ${payload.verification_type} Verification`,
      template: `
      Hello {user.firstName},

      Your {type} KYC {payload.verification_type} verification. Check your app for more information
      `,
    });
  }
});
