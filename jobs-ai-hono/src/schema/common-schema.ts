import { z } from "zod";

// 通用成功响应
export const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
});

// 通用错误响应
export const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    error: z.string().optional(),
});

// 通用响应(成功或失败)
export const commonResponseSchema = z.union([
    successResponseSchema,
    errorResponseSchema,
]);

// 分页参数
export const paginationQuerySchema = z.object({
    page: z.string().optional().default("1"),
    pageSize: z.string().optional().default("20"),
});

// 分页响应
export const paginationResponseSchema = z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
});
