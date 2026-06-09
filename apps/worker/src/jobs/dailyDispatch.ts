import { Queue, Worker } from "bullmq";
import { DISPATCH_CRON } from "@kaptano/shared";
import { runDailyDispatch } from "./dailyDispatchLogic";
import { logger } from "../lib/logger";
import { getRedisConnection } from "../lib/redis";

const connection = getRedisConnection();

const DISPATCH_QUEUE = "daily-dispatch";

export const dispatchQueue = new Queue(DISPATCH_QUEUE, { connection });

export async function scheduleDailyDispatch(): Promise<void> {
  await dispatchQueue.add(
    "dispatch",
    {},
    {
      repeat: { pattern: DISPATCH_CRON },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
  logger.info("Daily dispatch cron scheduled");
}

export function startDispatchWorker(): Worker {
  return new Worker(
    DISPATCH_QUEUE,
    async () => {
      await runDailyDispatch();
    },
    { connection, concurrency: 1 }
  );
}
