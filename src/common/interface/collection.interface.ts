import type { Model } from "mongoose";
import { User, type IUserDocument } from "@/model";

export enum AccessTypeEnum {
  USER = "USER",
}

export type TUser = IUserDocument;

interface ModelRegistry {
  USER: IUserDocument;
  // ADMIN: IAdmin;
  // MERCHANT: IMerchant;
  // Add more models here
}

type ModelMap = {
  [K in keyof ModelRegistry]: Model<ModelRegistry[K]>;
};

const models = {
  USER: User as Model<ModelRegistry[AccessTypeEnum.USER]>,
} as ModelMap;

//Retrieve a mongoose model based on the model name.
export const getModel = <K extends keyof ModelRegistry>(
  modelName: K
): Model<ModelRegistry[K]> =>
  models[modelName] as unknown as Model<ModelRegistry[K]>;
