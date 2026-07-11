import { ENVIRONMENT, logger } from "@/common";
import mongoose, { type ConnectOptions } from "mongoose";

export interface CustomConnectOptions extends ConnectOptions {
  maxPoolSize?: number;
  minPoolSize?: number;
}

export const connectDb = async (): Promise<void> => {
  try {
    if (!ENVIRONMENT.DB.URL) {
      logger.error("DB_URL is not provided in the environment variables");
      throw new Error("DB_URL is not provided in the environment variables");
    }
    const conn = await mongoose.connect(ENVIRONMENT.DB.URL, {
      ...(Bun.env.NODE_ENV === "production" && {
        minPoolSize: 100,
        maxPoolSize: 200,
      }),
      autoIndex: true,
    } as CustomConnectOptions);

    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error("Error: " + (error as Error).message);
    process.exit(1);
  }
};
