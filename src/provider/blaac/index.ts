import {
  HttpMethod,
  StatusEnum,
  type IBlaacDataReq,
  type IBlaacPurchaseResponse,
} from "@/common";
import { callBlaac } from "./connect.blaac";

export const blaacDataPurchase = async (payload: IBlaacDataReq) => {
  const { data, error } = await callBlaac<IBlaacPurchaseResponse>(
    "/data/purchase",
    HttpMethod.POST,
    { data: payload },
  );

  if (error || !data) {
    return { error, data: null };
  }

  const meta = {
    status:
      data.status === "success" ? StatusEnum.SUCCESS : StatusEnum.PROCESSING,
    message: null,
  };

  return {
    data: {
      ...data,
      meta,
    },
    error: null,
  };
};
