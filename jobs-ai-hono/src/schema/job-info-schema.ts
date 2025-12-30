import { z } from "@hono/zod-openapi";

export const experienceLevelSchema = z.enum(["junior", "mid-level", "senior"]);

export const jobInfoSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  isPublic: z.boolean().nullable(),
  name: z.string(),
  title: z.string().nullable(),
  description: z.string(),
  experienceLevel: experienceLevelSchema,
  createdAt: z.coerce.number(),
  updatedAt: z.coerce.number(),
});

export const createJobInfoRequestSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  title: z.string().optional(),
  description: z.string().min(1, "职位描述不能为空"),
  experienceLevel: experienceLevelSchema,
  isPublic: z.boolean().optional(),
});

export const updateJobInfoRequestSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().optional(),
  description: z.string().min(1).optional(),
  experienceLevel: experienceLevelSchema.optional(),
  isPublic: z.boolean().optional(),
});

export const jobInfoResponseSchema = z.object({
  success: z.boolean(),
  jobInfo: jobInfoSchema.optional(),
  message: z.string().optional(),
});

export const jobInfoListResponseSchema = z.object({
  success: z.boolean(),
  jobInfos: z.array(jobInfoSchema),
  message: z.string().optional(),
});

export const errorResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});
