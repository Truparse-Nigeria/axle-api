import {
  AppError,
  billServiceCheck,
  cacheKey,
  getCache,
  sendResponse,
  setCache,
  validateDataPlatformSchema,
  validateRequestPayload,
  VendorEnum,
  type IRegularData,
} from "@/common";
import { catchAsync } from "@/middleware";
import { vtpassVariation } from "@/provider";
import mongoose from "mongoose";

const { REGULAR_DATA_KEY } = cacheKey;

export const getRegularData = catchAsync(async (req, res) => {
  const { network } = await validateRequestPayload(
    req.params,
    validateDataPlatformSchema,
  );

  const key = `${network}_${REGULAR_DATA_KEY}`;

  let combo = await getCache<IRegularData[]>(key);

  if (!combo?.length) {
    combo = await regularDataQuery(network);
    await setCache<IRegularData[]>(key, combo, 24 * 60 * 60);
  }

  return sendResponse(
    res,
    200,
    null,
    combo.map(({ planId, provider, ...rest }) => rest),
  );
});

export const regularDataQuery = async (
  network: string,
): Promise<IRegularData[]> => {
  const checkService = await billServiceCheck("regularData", network);
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

  return variationsCombo.map((item) => ({
    _id: `REG_${new mongoose.Types.ObjectId()}`,
    network,
    name: item.name,
    planId: item.variation_code,
    price: Number(item.variation_amount),
    isPromo: false,
    provider: checkService.name.toLowerCase(),
  }));
};
