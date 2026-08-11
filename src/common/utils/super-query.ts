import { eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import type { Model } from "mongoose";
import type { ISuperQuery } from "../interface";
import { prepareFilterForAggregation } from "./helper";

/* ─────────────────────── Gap Fill Helpers ─────────────────────── */

const fillMissingDays = (data: any[], fromDate: Date, toDate: Date) => {
  const allDays = eachDayOfInterval({ start: fromDate, end: toDate });
  const map = new Map<string, any>();
  for (const record of data) {
    const key = `${record.year}-${String(record.month).padStart(2, "0")}-${String(record.day).padStart(2, "0")}`;
    map.set(key, record);
  }
  return allDays.map((date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return map.get(key) || { year, month, day, total: 0 };
  });
};

const fillMissingMonths = (data: any[], fromDate: Date, toDate: Date) => {
  const allMonths = eachMonthOfInterval({ start: fromDate, end: toDate });
  const map = new Map<string, any>();
  for (const record of data) {
    const key = `${record.year}-${String(record.month).padStart(2, "0")}`;
    map.set(key, record);
  }
  return allMonths.map((date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    return map.get(key) || { year, month, total: 0 };
  });
};

/* ─────────────────────── Main Function ─────────────────────── */

export const superQuery = async <T>(
  model: Model<T>,
  payload: ISuperQuery<T>,
) => {
  const {
    filter = {},
    search,
    pagination,
    sort = { createdAt: -1 },
    joins = [],
    groupBy,
    sumField,
    rangeSumField,
    hiddenFields,
    skipObjectIdConversion,
  } = payload;

  const hasPagination = !!(pagination?.currentPage && pagination?.pageSize);

  // A query is an aggregation if it groups OR sums (but not a bare "" sumField without groupBy)
  // Pure count/sum with no groupBy is also aggregation
  const isGroupQuery = !!groupBy;
  const isSumOnlyQuery = !!(sumField && !groupBy);
  const isAggregationQuery = isGroupQuery || isSumOnlyQuery;

  // Resolve the $sum accumulator:
  // - sumField.field is a real field name → sum that field
  // - sumField exists but field is "" or "count" → count documents ($sum: 1)
  // - no sumField → count documents ($sum: 1) when groupBy is present
  const resolveSumAccumulator = () => {
    if (
      sumField &&
      sumField.field &&
      sumField.field.trim() !== "" &&
      sumField.field !== "count"
    ) {
      return { $sum: `$${sumField.field}` };
    }
    return { $sum: 1 };
  };

  const pipeline: any[] = [];

  /* ═══════════════════════════════════════════════════════════════
     STAGE 1 — FILTERS (run first to narrow dataset before anything)
  ═══════════════════════════════════════════════════════════════ */

  if (Object.keys(filter).length > 0) {
    pipeline.push({
      $match: prepareFilterForAggregation(filter, skipObjectIdConversion),
    });
  }

  if (rangeSumField) {
    pipeline.push({
      $match: {
        [rangeSumField.field]: {
          $gte: new Date(rangeSumField.fromDate),
          $lte: new Date(rangeSumField.toDate),
        },
      },
    });
  }

  // GroupBy date range filter — applied early to keep $group working on right data
  if (groupBy?.fromDate && groupBy?.toDate) {
    const from = new Date(groupBy.fromDate);
    const to = new Date(groupBy.toDate);
    to.setHours(23, 59, 59, 999);
    pipeline.push({
      $match: { [groupBy.field]: { $gte: from, $lte: to } },
    });
  }

  if (search?.keyword.trim()) {
    const words = search.keyword.trim().split(/\s+/);
    // Lookahead-based combined regex: all words must appear somewhere in the field
    const combinedPattern = words.map((w) => `(?=.*${w})`).join("");
    const combinedRegex = new RegExp(combinedPattern, "i");
    pipeline.push({
      $match: {
        $or: search.fields.map((field) => ({
          [field]: { $regex: combinedRegex },
        })),
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     JOIN BUILDER — reusable, only joins on what is passed
  ═══════════════════════════════════════════════════════════════ */

  const buildJoinStages = (): any[] => {
    if (!joins.length) return [];
    return joins.flatMap((join) => {
      const lookup: any = {
        $lookup: {
          from: join.from,
          localField: join.localField,
          foreignField: join.foreignField,
          as: join.as,
          ...(join.pipeline ? { pipeline: join.pipeline } : {}),
        },
      };
      // Auto-unwind to object if caller marks this as a single/belongs-to relation
      if (join.single) {
        return [
          lookup,
          {
            $unwind: {
              path: `$${join.as}`,
              preserveNullAndEmptyArrays: true,
            },
          },
        ];
      }
      return [lookup];
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     STAGE 2A — GROUP BY (date bucketing + optional sum/count)
     Joins are pushed BEFORE grouping only when needed (rare).
     In most cases chart/analytics queries don't need joined data.
  ═══════════════════════════════════════════════════════════════ */

  if (isGroupQuery && groupBy!.type !== "range") {
    const dateField = `$${groupBy!.field}`;

    const groupId: Record<string, any> =
      groupBy!.type === "year"
        ? { year: { $year: dateField } }
        : groupBy!.type === "month"
          ? { year: { $year: dateField }, month: { $month: dateField } }
          : {
              // day
              year: { $year: dateField },
              month: { $month: dateField },
              day: { $dayOfMonth: dateField },
            };

    // Only add joins before group if the sumField references a joined field
    // (most analytics queries don't need this — keep joins out for speed)
    if (joins.length && sumField?.fromJoin) {
      pipeline.push(...buildJoinStages());
    }

    pipeline.push({
      $group: { _id: groupId, total: resolveSumAccumulator() },
    });

    // Project _id fields to top level
    pipeline.push({
      $project: {
        _id: 0,
        year: "$_id.year",
        ...(groupBy!.type !== "year" && { month: "$_id.month" }),
        ...(groupBy!.type === "day" && { day: "$_id.day" }),
        total: 1,
      },
    });

    pipeline.push({ $sort: sort });
  }

  /* ═══════════════════════════════════════════════════════════════
     STAGE 2B — PURE SUM (no grouping, just one total number)
     Return early — no pagination, joins, or projection needed.
  ═══════════════════════════════════════════════════════════════ */

  if (isSumOnlyQuery) {
    if (joins.length && sumField?.fromJoin) {
      pipeline.push(...buildJoinStages());
    }
    pipeline.push({
      $group: { _id: null, total: resolveSumAccumulator() },
    });
    const result = await model.aggregate(pipeline).allowDiskUse(true);
    return result[0]?.total ?? 0;
  }

  /* ═══════════════════════════════════════════════════════════════
     STAGE 3 — DOCUMENT QUERIES (list / paginated)

     Two parallel aggregations instead of $facet:
       • countPipeline uses only the $match stages — no sort, no joins,
         no skip/limit — so Mongo can satisfy it from an index scan.
       • dataPipeline sorts → slices (skip/limit) → THEN joins, so
         $lookup fires against at most `limit` documents, not the full set.
       • Both run concurrently via Promise.all, so wall-clock time
         ≈ max(countTime, dataTime), not the sum.
  ═══════════════════════════════════════════════════════════════ */

  if (!isAggregationQuery) {
    if (hasPagination) {
      const page = pagination!.currentPage;
      const limit = Math.min(pagination!.pageSize, 100);
      const skip = (page - 1) * limit;

      // Count pipeline: reuses only the $match stages already in `pipeline`
      const countPipeline = [...pipeline, { $count: "total" }];

      // Data pipeline: sort → slice → join (only `limit` docs get joined)
      const dataPipeline = [
        ...pipeline,
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        ...buildJoinStages(),
        ...(hiddenFields?.length
          ? [
              {
                $project: hiddenFields.reduce(
                  (acc, f) => {
                    acc[f as string] = 0;
                    return acc;
                  },
                  {} as any,
                ),
              },
            ]
          : []),
      ];

      // Fire both concurrently — wall-clock time ≈ max(count, data), not sum
      const [countResult, response] = await Promise.all([
        model.aggregate(countPipeline).allowDiskUse(true),
        model.aggregate(dataPipeline).allowDiskUse(true),
      ]);

      const total = countResult[0]?.total ?? 0;

      return {
        response,
        pagination: { total, currentPage: page, limit },
      };
    } else {
      // Non-paginated list: joins still deferred but run on full filtered set
      pipeline.push({ $sort: sort });
      pipeline.push(...buildJoinStages());

      if (hiddenFields?.length) {
        pipeline.push({
          $project: hiddenFields.reduce(
            (acc, f) => {
              acc[f as string] = 0;
              return acc;
            },
            {} as any,
          ),
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     EXECUTE
  ═══════════════════════════════════════════════════════════════ */

  let result = await model.aggregate(pipeline).allowDiskUse(true);

  /* ═══════════════════════════════════════════════════════════════
     POST-PROCESS — fill calendar gaps for charting queries
  ═══════════════════════════════════════════════════════════════ */

  if (groupBy?.type === "day" && groupBy.fromDate && groupBy.toDate) {
    const from = new Date(groupBy.fromDate);
    const to = new Date(groupBy.toDate);
    to.setHours(23, 59, 59, 999);
    result = fillMissingDays(result, from, to);
  }

  if (groupBy?.type === "month" && groupBy.fromDate && groupBy.toDate) {
    const from = new Date(groupBy.fromDate);
    const to = new Date(groupBy.toDate);
    to.setHours(23, 59, 59, 999);
    result = fillMissingMonths(result, from, to);
  }

  return hasPagination && !isAggregationQuery ? result[0] : result;
};
