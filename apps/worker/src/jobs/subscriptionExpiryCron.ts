import { Queue, Worker } from "bullmq";
import { getRedisConnection } from "../lib/redis";
import { expireSubscriptions } from "./subscriptionExpiry";
import { logger } from "../lib/logger";

const connection = getRedisConnection();
const EXPIRY_QUEUE = "subscription-expiry";

export const expiryQueue = new Queue(EXPIRY_QUEUE, { connection });

export async function scheduleSubscriptionExpiry(): Promise<void> {
  await expiryQueue.add(
    "expire",
    {},
    {
      repeat: { pattern: "0 3 * * *" },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
  logger.info("Subscription expiry cron scheduled");
}

export function startExpiryWorker(): Worker {
  return new Worker(
    EXPIRY_QUEUE,
    async () => {
      await expireSubscriptions();
    },
    { connection, concurrency: 1 }
  );
}
