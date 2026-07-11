import type { JOB_TYPE } from "../constant";


export interface IBaseJobType {
  type: JOB_TYPE;
  priority?: number;
  delay?: number; // In milliseconds (passed directly to BullMQ)
  jobId?: string;
}

export interface ISendMail extends IBaseJobType {
  to: string;
  subject: string;
  template: any;
  attachments?: {
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }[];
}