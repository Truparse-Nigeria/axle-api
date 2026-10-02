import {
  AccessTypeEnum,
  cacheKey,
  getCache,
  sendResponse,
  setCache,
  sortDataPlans,
  type IDataPlan,
} from "@/common";
import { catchAsync } from "@/middleware";
import { DataPlan } from "@/model";

const { CHEAP_DATA_KEY } = cacheKey;

export const getCheapData = (accessType: AccessTypeEnum) =>
  catchAsync(async (req, res) => {
    // Users get the sorted copy with internal fields stripped
    const key =
      accessType === AccessTypeEnum.USER
        ? `${CHEAP_DATA_KEY}:SORTED`
        : `${CHEAP_DATA_KEY}:FULL`;

    const cachedData = await getCache<IDataPlan[]>(key);
    if (cachedData?.length) return sendResponse(res, 200, null, cachedData);

    const { data, sortedData } = await cheapDataQuery();

    return sendResponse(
      res,
      200,
      null,
      accessType === AccessTypeEnum.USER ? sortedData : data,
    );
  });

export const cheapDataQuery = async () => {
  const data = (await DataPlan.find({ active: true }).lean()).map((plan) => ({
    ...plan,
    _id: String(plan._id),
  })) as unknown as IDataPlan[];

  if (!data.length) return { data: [], sortedData: [] };

  const sortedData = sortDataPlans(data);

  await setCache(`${CHEAP_DATA_KEY}:FULL`, data, 24 * 60 * 60);
  await setCache(`${CHEAP_DATA_KEY}:SORTED`, sortedData, 24 * 60 * 60);

  return { data, sortedData };
};
