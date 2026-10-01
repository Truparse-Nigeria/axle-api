import {
  AppError,
  reformatSensitiveFields,
  sendResponse,
  SENSITIVE_BENEFICIARY_FIELDS,
  superQuery,
  SuperQuerySchema,
  validateRequestPayload,
  type IBeneficiary,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Beneficiary } from "@/model";

export const retrieveBeneficiaries = catchAsync(async (req, res) => {
  const { filter, pagination, search } = await validateRequestPayload(
    req.body,
    SuperQuerySchema,
  );

  const user = req.user;

  if (!user) {
    throw new AppError("User not found");
  }

  const beneficiaries = await superQuery<IBeneficiary>(Beneficiary, {
    filter: {
      ...filter,
      createdBy: user._id,
      isDeleted: { $ne: true },
    },
    search,
    pagination,
    hiddenFields: reformatSensitiveFields(SENSITIVE_BENEFICIARY_FIELDS),
  });

  if (!beneficiaries) {
    throw new AppError("Oops, we couldn't get beneficiaries. Please try again.");
  }

  return sendResponse(
    res,
    200,
    "Beneficiaries retrieved successfully",
    beneficiaries,
  );
});
