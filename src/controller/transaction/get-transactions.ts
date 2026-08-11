import {
  AccessTypeEnum,
  AppError,
  reformatSensitiveFields,
  sendResponse,
  SENSITIVE_TRANSACTION_FIELDS,
  StatusEnum,
  superQuery,
  SuperQuerySchema,
  validateRequestPayload,
  zonedTime,
  type ITransaction,
} from "@/common";
import { catchAsync } from "@/middleware";
import { Transaction } from "@/model";
import { endOfDay, startOfDay } from "date-fns";

export const getTransactions = (accessType: AccessTypeEnum) =>
  catchAsync(async (req, res) => {
    const payload = await validateRequestPayload(req.body, SuperQuerySchema);

    const { filter, pagination, sumField, groupBy, joins, search } = payload;

    const user = req.user;

    if (!user) throw new AppError("No user found");

    const { startDate, endDate, status, ...rest } = filter ?? {};

    const isUser = accessType === AccessTypeEnum.USER;

    // Filter by status
    const statusQuery = () => {
      const defaultStatuses = [
        StatusEnum.SUCCESS,
        StatusEnum.REVERSAL,
        StatusEnum.PROCESSING,
      ]; // only for users
      const selected = status || (isUser ? defaultStatuses : null);
      return selected
        ? { status: { $in: Array.isArray(selected) ? selected : [selected] } }
        : {};
    };

    const dateFilter: Record<string, any> = {};
    if (startDate) dateFilter.$gte = zonedTime(startOfDay(new Date(startDate)));
    if (endDate) dateFilter.$lte = zonedTime(endOfDay(new Date(endDate)));

    // Query Transactions
    const transactions = await superQuery<ITransaction>(Transaction, {
      filter: {
        ...rest,
        ...statusQuery(),
        ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        user: user._id,
      },
      search,
      joins,
      pagination,
      sumField,
      groupBy,
      hiddenFields: reformatSensitiveFields(SENSITIVE_TRANSACTION_FIELDS),
    });

    if (!transactions) throw new AppError("No transactions found");

    return sendResponse(res, 200, null, transactions);
  });
