import { logger, redis, type TJobData } from "@/common";
import { Queue, QueueEvents } from "bullmq";

// Create a new connection in every node instance
const mainQueue = new Queue<TJobData>("mainQueue", {
  connection: redis.queue,
});

// EVENT LISTENERS
// create a queue event listener
const mainQueueEvent = new QueueEvents("mainQueue", {
  connection: redis.queue,
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
  await mainQueue
    .upsertJobScheduler(
      "requery-vtpass-transactions",
      { every: 5 * 60 * 1000 }, // every 5 minutes
      {
        name: "REQUERY_VTPASS_TRANSACTIONS",
        data: { type: "REQUERY_VTPASS_TRANSACTIONS" },
        opts: { removeOnComplete: true, removeOnFail: { count: 0 } },
      }
    )
    .catch((err) => {
      logger.error(`Failed to register repeatable jobs: ${err}`);
    });
};

export { mainQueue, mainQueueEvent, registerRepeatableJobs };
