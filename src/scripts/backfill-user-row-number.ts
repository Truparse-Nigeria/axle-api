// CLI alternative to GET /api/v1/user/backfill-row-number:
//   bun run src/scripts/backfill-user-row-number.ts
import { connectDb, logger } from "@/common";
import { backfillUserRowNumbers } from "@/controller/user";
import mongoose from "mongoose";

const run = async () => {
  await connectDb();
  const { total, updated } = await backfillUserRowNumbers();
  logger.info(`Done: ${updated} of ${total} users given a row number`);
};

run()
  .catch((error) => {
    logger.error("Row number backfill failed: " + (error as Error).message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit();
  });
