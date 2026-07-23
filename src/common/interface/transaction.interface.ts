import type { Document } from "mongoose";
import type { StatusEnum } from "../enum";
import type { IUser } from "./user.interface";

export interface ITransactionPayload {
  user: string | IUser;
  sessionId?: string;
  reference: string;
  sourceCurrency: string;
  destinationCurrency: string;
  exchangeRate: number;
  amount: number;
  activity: string;
  description: string;
  settlement: number;
  provider: string;
  purpose: string;
  status: StatusEnum;
  requestPayload: Record<string, any>;
  responsePayload?: Record<string, any>;
  view: Record<string, any>;
  initialBalance: number;
  finalBalance: number;
  meta: Record<string, any>;
}

export interface ITransaction extends Document, ITransactionPayload {}
