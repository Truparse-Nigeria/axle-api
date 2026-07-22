import {
  AppError,
  HttpMethod,
  messageVtpass,
  type IServiceData,
  type IVerifyRes,
  type IVtpass,
  type IVtpassBalanceResponse,
  type IVtpassPayResponse,
  type IVtpassVerify,
  type TVtpassPay,
} from "@/common";
import { callVtpass, handleVtpassPayResponse } from "./connect.vtpass";

//Get VTpass Balance
export const vtpassBalance = async () => {
  const { data, error } = await callVtpass<IVtpassBalanceResponse>(
    "/balance",
    HttpMethod.GET,
  );

  if (error || !data || data?.code !== 1) {
    throw new AppError("Could not complete transaction. Try again later", 400);
  }

  return { data: data.contents.balance };
};

// Handle all VTpass Payment
export const vtpassPay = async (payload: TVtpassPay) => {
  const { data, error } = await callVtpass<IVtpassPayResponse>(
    "/pay",
    HttpMethod.POST,
    { data: payload },
  );

  const info = handleVtpassPayResponse(data!);

  const meta = {
    status: info,
    message: messageVtpass(error?.code || data?.code) || undefined,
  };

  if (error || !data)
    return {
      error: {
        ...error,
        message: messageVtpass(error?.code),
      },
    };

  return {
    data: {
      ...data,
      message: messageVtpass(data?.code),
      meta,
    },
  };
};

// Handle all VTpass Requery
export const vtpassRequery = async (reference: string) => {
  const { data, error } = await callVtpass<IVtpassPayResponse>(
    "/requery",
    HttpMethod.POST,
    { data: { request_id: reference } },
  );

  const info = handleVtpassPayResponse(data!);

  if (error || !data) return { error };

  const meta = {
    status: info,
  };

  return {
    data: {
      ...data,
      message: messageVtpass(data?.code),
      meta,
    },
  };
};

// Handle all VTpass Variation
export const vtpassVariation = async (serviceID: string) => {
  const { data, error } = await callVtpass<IVtpass<IServiceData>>(
    "/service-variations",
    HttpMethod.GET,
    { params: { serviceID } },
  );

  if (error || !data || data?.response_description !== "000") {
    throw new AppError("Oops! could not get plans. Try again", 400);
  }

  return { data: data.content, error: null };
};

// Handle all VTpass Verify for Cable
export const vtpassVerifyCable = async (payload: IVtpassVerify) => {
  const { data, error } = await callVtpass<
    IVtpass<IVerifyRes | { error?: string | Record<string, any> }>
  >("/merchant-verify", HttpMethod.POST, { data: payload });

  if (error || !data || data.code !== "000" || data.content.error) {
    return { data: null, error: error || data };
  }

  const { Customer_Name, Customer_Number, Customer_Type } =
    data.content as IVerifyRes;

  return {
    data: {
      customerName: Customer_Name,
      customerNumber: Customer_Number,
      customerType: Customer_Type,
    },
    error: null,
  };
};

// Handle all VTpass Verify for Electricity
export const vtpassVerifyMeter = async (payload: IVtpassVerify) => {
  const { data, error } = await callVtpass<
    IVtpass<IVerifyRes | { error?: string | Record<string, any> }>
  >("/merchant-verify", HttpMethod.POST, { data: payload });

  if (error || !data || data.code !== "000" || data.content.error) {
    return { data: null, error: error || data };
  }

  const { Customer_Name, Address, Meter_Number, Meter_Type } =
    data.content as IVerifyRes;

  return {
    data: {
      customerName: Customer_Name,
      address: Address,
      meterNumber: Meter_Number,
      type: Meter_Type,
    },
    error: null,
  };
};
