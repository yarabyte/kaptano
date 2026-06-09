import { Queue, Worker, type Job } from "bullmq";
import {
  SEND_JITTER_MIN_MS,
  SEND_JITTER_MAX_MS,
  MAX_SEND_ATTEMPTS,
} from "@kaptano/shared";
import { processSendJob } from "../jobs/sendWhatsapp";
import { logger } from "../lib/logger";
import { getRedisConnection } from "../lib/redis";

const connection = getRedisConnection();

export const SEND_QUEUE_NAME = "whatsapp-send";

export const sendQueue = new Queue(SEND_QUEUE_NAME, { connection });

export type SendJobData = {
  messageJobId: string;
  tenantId: string;
};

function randomJitter(): number {
  return (
    SEND_JITTER_MIN_MS +
    Math.floor(Math.random() * (SEND_JITTER_MAX_MS - SEND_JITTER_MIN_MS))
  );
}

export async function enqueueSendJob(
  data: SendJobData,
  delayMs: number
): Promise<void> {
  await sendQueue.add("send", data, {
    delay: delayMs,
    attempts: MAX_SEND_ATTEMPTS,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}

export function startSendWorker(): Worker {
  const worker = new Worker<SendJobData>(
    SEND_QUEUE_NAME,
    async (job: Job<SendJobData>) => {
      await processSendJob(job.data);
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 1,
        duration: randomJitter(),
      },
    }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Send job failed");
  });

  return worker;
}

export { randomJitter };
