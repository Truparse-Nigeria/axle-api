import type { TJobData } from "@/common";
import { mainQueue } from "./queue";

export const createJob = async <T extends TJobData>(job: T) => {
  await mainQueue
    .add(job.type, job, {
      delay: job.delay,
      priority: job.priority,
      jobId: job.jobId,
    })
    .catch((err) => {
      //TODO: Add monitor in the future
      console.error(err);
    });
};
