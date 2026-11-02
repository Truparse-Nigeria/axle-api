import { logger, sendResponse } from "@/common";
import { catchAsync } from "@/middleware";
import { getNextRowNumber, isDuplicateRowNumberError, User } from "@/model";

const MAX_ATTEMPTS = 10;

let running = false;

// Takes the next free number for one user. If a concurrent signup grabbed the
// same number, the unique index rejects the write and we pick a fresh one.
const assignRowNumber = async (id: unknown): Promise<boolean> => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const updated = await User.findOneAndUpdate(
        { _id: id, rowNumber: { $exists: false } },
        { $set: { rowNumber: await getNextRowNumber() } },
        { new: true },
      ).select("_id");

      return !!updated;
    } catch (error) {
      if (!isDuplicateRowNumberError(error)) throw error;
    }
  }

  throw new Error(`Could not assign a row number to user ${id}`);
};

// Gives a rowNumber to every user that lacks one, oldest first. Idempotent:
// users that already have a number are never touched.
export const backfillUserRowNumbers = async (): Promise<{
  total: number;
  updated: number;
}> => {
  const filter = { rowNumber: { $exists: false } };
  const total = await User.countDocuments(filter);
  let updated = 0;

  const cursor = User.find(filter)
    .sort({ createdAt: 1, _id: 1 })
    .select("_id")
    .lean()
    .cursor();

  for await (const { _id } of cursor) {
    if (await assignRowNumber(_id)) updated++;
    if (updated > 0 && updated % 500 === 0) {
      logger.info(`Row number backfill: ${updated}/${total} users`);
    }
  }

  return { total, updated };
};

// Open GET endpoint. The work runs in the background (it can outlast a request
// timeout on a big collection) and progress is written to the logs.
export const backfillRowNumber = catchAsync(async (req, res) => {
  if (running) {
    return sendResponse(res, 202, "Row number backfill is already running");
  }

  const pending = await User.countDocuments({ rowNumber: { $exists: false } });

  if (pending === 0) {
    return sendResponse(res, 200, "No users need a row number");
  }

  running = true;

  backfillUserRowNumbers()
    .then(({ total, updated }) =>
      logger.info(`Row number backfill done: ${updated}/${total} users`),
    )
    .catch((error) =>
      logger.error("Row number backfill failed: " + (error as Error).message),
    )
    .finally(() => {
      running = false;
    });

  return sendResponse(res, 202, "Row number backfill started", { pending });
});
