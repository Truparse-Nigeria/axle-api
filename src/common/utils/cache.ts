import { redis } from "../config";
import AppError from "./app-error";

export const setCache = async <T>(
  key: string,
  value: string | T,
  expiry?: number,
): Promise<void> => {
  try {
    const json = JSON.stringify(value);
    if (expiry) {
      await redis.main.set(key, json, "EX", expiry);
    } else {
      await redis.main.set(key, json);
    }
  } catch (error) {
    throw new AppError("Something went wrong", 500);
  }
};

export const setnxCache = async <T>(
  key: string,
  value: string | T,
): Promise<number> => {
  try {
    const json = JSON.stringify(value);
    return await redis.main.setnx(key, json);
  } catch (error) {
    throw new AppError("Something went wrong", 500);
  }
};

export const expireCache = async <T>(
  key: string,
  expire: number,
): Promise<number> => {
  try {
    return await redis.main.expire(key, expire);
  } catch (error) {
    throw new AppError("Something went wrong", 500);
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const json = await redis.main.get(key);

    if (json) {
      return JSON.parse(json);
    }

    return null;
  } catch (error) {
    throw new AppError("Something went wrong", 500);
  }
};

export const deleteCache = async (key: string) => {
  try {
    return redis.main.del(key);
  } catch (error) {
    throw new AppError("Something went wrong", 500);
  }
};

export const incrCache = async (
  key: string,
  expiry?: number,
): Promise<number> => {
  try {
    const count = await redis.main.incr(key);

    if (count === 1 && expiry) {
      await redis.main.expire(key, expiry);
    }

    return count;
  } catch (error) {
    throw new AppError("Something went wrong", 500);
  }
};

export const decrCache = async (
  key: string,
  expiry?: number,
): Promise<number> => {
  try {
    const count = await redis.main.decr(key);

    return count;
  } catch (error) {
    throw new AppError("Something went wrong", 500);
  }
};

export const decrCacheBy = async (
  key: string,
  value: number,
  expiry?: number,
): Promise<number> => {
  try {
    const count = await redis.main.decrby(key, value);

    return count;
  } catch (error) {
    throw new AppError("Something went wrong", 500);
  }
};

export const setnxWithExpiry = async <T>(
  key: string,
  value: string | T,
  expiry: number,
): Promise<number> => {
  try {
    const json = JSON.stringify(value);
    // SET key value NX EX expiry — single atomic operation
    const result = await redis.main.set(key, json, "EX", expiry, "NX");
    return result === "OK" ? 1 : 0;
  } catch (error) {
    throw new AppError("Something went wrong", 500);
  }
};
