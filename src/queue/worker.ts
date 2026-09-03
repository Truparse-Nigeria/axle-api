import { logger, redis, type JOB_TYPE, type TJobData} from "@/common";
import { processStaticAccount } from "@/job";
import { sendEmail } from "@/provider";
import {
  Worker,
  type ConnectionOptions,
  type Job,
  type WorkerOptions,
} from "bullmq";

// define worker options
interface MainWorkerOptions extends WorkerOptions {}

const mainWorkerOptions: MainWorkerOptions = {
  connection: redis.queue as ConnectionOptions,
  concurrency: 5,
  removeOnFail: { count: 0 },
};

// create a worker to process jobs from the job queue
export const mainWorker = new Worker<TJobData>(
  "mainQueue",
  async (job: Job) => {
    const type = job.data.type;

    switch (type as JOB_TYPE) {
      case "SEND_EMAIL":
        return await sendEmail(job.data);
      case "PROCESS_STATIC_ACCOUNT":
        return await processStaticAccount(job.data);
      default:
        //TODO:  Add monitor in the future
        logger.error(`Unknown job type: ${type}`);
    }
  },
  mainWorkerOptions
);

mainWorker.on("error", (err: any) => {
  logger.error(`Error processing job: ${err}`);
});
