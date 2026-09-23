import { logger, redis, type TJobData } from "@/common";
import { Queue, QueueEvents, type ConnectionOptions } from "bullmq";

// Create a new connection in every node instance
const mainQueue = new Queue<TJobData>("mainQueue", {
  connection: redis.queue as ConnectionOptions,
});

// EVENT LISTENERS
// create a queue event listener
const mainQueueEvent = new QueueEvents("mainQueue", {
  connection: redis.queue as ConnectionOptions,
});

mainQueueEvent.on("failed", ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} failed with error ${failedReason}`);
});

mainQueueEvent.on("waiting", (job) => {
  // console.log(⁠ A job with ID ${jobId} is waiting ⁠);
});

mainQueueEvent.on("completed", ({ jobId, returnvalue }) => {
  // console.log(⁠ Job ${jobId} completed ⁠, returnvalue);
  // Called every time a job is completed in any worker
});

// Register all recurring (repeatable) jobs. Uses job schedulers so a single
// schedule is upserted per id — safe to call on every boot/instance.
const registerRepeatableJobs = async () => {
  await mainQueue.upsertJobScheduler(
    "generate-multicurrency-account",
    // { every: 10 * 60 * 1000 }, // every 10 minutes
    { every: 30 * 1000 }, // every 30 sec
    {
      name: "GENERATE_MULTICURRENCY_ACCOUNT",
      data: { type: "GENERATE_MULTICURRENCY_ACCOUNT" },
      opts: { removeOnComplete: true, removeOnFail: { count: 0 } },
    },
  );
};

export { mainQueue, mainQueueEvent, registerRepeatableJobs };
