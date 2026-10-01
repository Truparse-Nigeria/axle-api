import {
  AppError,
  beneficiaryIdSchema,
  sendResponse,
  validateRequestPayload,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Beneficiary } from "@/model";

export const removeBeneficiary = catchAsync(async (req, res) => {
  const { id } = await validateRequestPayload(req.params, beneficiaryIdSchema);

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  // Scoped to the owner so a user can only remove their own beneficiaries
  const deletedBeneficiary = await Beneficiary.findOneAndUpdate(
    { _id: id, createdBy: user._id },
    { $set: { isDeleted: true } },
    { new: true },
  );

  if (!deletedBeneficiary) {
    throw new AppError(
      "Oops, we couldn't delete beneficiary. Please try again.",
    );
  }

  return sendResponse(res, 200, "Beneficiary deleted successfully", {});
});
