import {
  AppError,
  billServiceCheck,
  getCache,
  sendResponse,
  setCache,
  validateCablePlatformSchema,
  validateRequestPayload,
  VendorEnum,
  type ICableCombo,
} from "@/common";
import { catchAsync } from "@/middleware";
import { vtpassVariation } from "@/provider";
import mongoose from "mongoose";

export const retrievePlans = catchAsync(async (req, res) => {
  const { entity } = await validateRequestPayload(
    req.params,
    validateCablePlatformSchema,
  );

  const checkService = await billServiceCheck("cable", entity);
  if (!checkService) {
    throw new AppError("Service not available");
  }

  const getCombo = await getCache<ICableCombo[]>(`CABLE_${entity}`);
  if (getCombo?.length) return sendResponse(res, 200, null, getCombo);

  const combo = await cablePlansQuery(entity);

  await setCache(`CABLE_${entity}`, combo, 12 * 60 * 60);

  return sendResponse(res, 200, null, combo);
});

export const cablePlansQuery = async (entity: string) => {
  const checkService = await billServiceCheck("cable", entity);
  if (!checkService) {
    throw new AppError("Service not available");
  }

  let response = null;

  // Conditional value for response if vtpass provider
  if (checkService.name.toLowerCase() === VendorEnum.VTPASS.toLowerCase()) {
    response = await vtpassVariation(checkService.slug);
  }
  if (response?.error || !response?.data) {
    throw new AppError("Unable to retrieve plans", 404);
  }

  if (checkService.name.toLowerCase() === VendorEnum.VTPASS.toLowerCase()) {
    const { variations, varations } = response.data;

    // Some output in variations is duplicated in varations
    const duplicatedVariationsCombo = [
      ...(varations || []),
      ...(variations || []),
    ];
    // Remove duplicates
    const variationsCombo = [
      ...new Map(
        duplicatedVariationsCombo.map((item) => [item.name, item]),
      ).values(),
    ];

    return variationsCombo.map((item) => {
      return {
        _id: `${entity}_${new mongoose.Types.ObjectId()}`,
        name: item.name.replace(/\bN[\d,]+\b/, "").trim(), // Remove amount of structure "Nx,xxx"
        code: item.variation_code,
        amount: Number(item.variation_amount),
      };
    });
  }
};
