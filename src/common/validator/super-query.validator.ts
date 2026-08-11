import { z } from "zod";

export const SuperQuerySchema = z.object({
  filter: z.optional(z.record(z.string(), z.any())),
  search: z.optional(
    z.object({
      fields: z.array(z.string()),
      keyword: z.string(),
    }),
  ),
  pagination: z.optional(
    z.object({
      currentPage: z.number().int().positive(),
      pageSize: z.number().int().positive(),
    }),
  ),
  sort: z.optional(z.record(z.string(), z.number().int())),
  joins: z.optional(
    z.array(
      z.object({
        from: z.string(),
        localField: z.string(),
        foreignField: z.string(),
        as: z.string(),
        single: z.optional(z.boolean()),
        pipeline: z.optional(z.array(z.any())),
      }),
    ),
  ),
  groupBy: z.optional(
    z.object({
      type: z.enum(["year", "month", "day", "range"]),
      field: z.string(),
      fromDate: z.optional(z.string()),
      toDate: z.optional(z.string()),
    }),
  ),
  sumField: z.optional(
    z.object({
      field: z.string(),
      fromJoin: z.optional(z.string()),
      toJoin: z.optional(z.string()),
    }),
  ),
  rangeSumField: z.optional(
    z.object({
      field: z.string(),
      fromDate: z.string(),
      toDate: z.string(),
    }),
  ),
  hiddenFields: z.optional(z.array(z.string())),
});
