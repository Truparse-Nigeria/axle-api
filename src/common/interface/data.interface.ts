import type { Document } from "mongoose";

export type TDataUnit = "MB" | "GB" | "TB";

export interface IDataPlan extends Document {
  provider: string;
  planId: string;
  name: string;
  size: string;
  unit: TDataUnit;
  unitPrice: number; // Provider cost price
  price: number; // Selling price
  network: string;
  active: boolean;
  extension: string;
  isPromo: boolean;
  description?: string;
}

export interface IRegularData {
  _id: string;
  network: string;
  name: string;
  planId: string;
  price: number;
  isPromo: boolean;
  provider: string;
}
