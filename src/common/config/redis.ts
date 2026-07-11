import Redis, { type RedisOptions } from "ioredis";
import { ENVIRONMENT } from "./environment";


// Create a type for our Redis clients for better type safety
export type RedisClients = {
  main: Redis;
  queue: Redis;
  campaign: Redis;
};

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000; // 3 seconds

// Configuration
const REDIS_OPTIONS = {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  offlineQueue: false,
  retryStrategy: (times: number) => {
    if (times >= MAX_RETRIES) {
      // Give up after MAX_RETRIES
      console.error("Unable to connect to Redis after maximum retries");
      return null;
    }
    // Retry after RETRY_DELAY_MS milliseconds
    return RETRY_DELAY_MS;
  },
};

// Create clients with shared configuration
const createRedisClient = (url: string, name: string, options: RedisOptions = {}) => {
  const client = new Redis(url, options);

  client.on("connect", () => {
    console.log(`Connected to Redis DB ${name} successfully!`);
  });

  client.on("error", (err) => {
    console.error(`Redis DB ${name} connection error:`, err);
  });

  return client;
};

// Initialize clients
const redis: RedisClients = {
  main: createRedisClient(ENVIRONMENT.REDIS.MAIN!, "main"),
  queue: createRedisClient(ENVIRONMENT.REDIS.QUEUE!, "queue", REDIS_OPTIONS),
  campaign: createRedisClient(ENVIRONMENT.REDIS.CAMPAIGN!, "campaign", REDIS_OPTIONS),
};

export default redis;
