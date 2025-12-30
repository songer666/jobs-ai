import { z } from "zod";

// 简历列表响应
export const resumeListResponseSchema = z.object({
    success: z.literal(true),
    resumes: z.array(z.any()),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
});

// 简历详情响应
export const resumeDetailResponseSchema = z.object({
    success: z.literal(true),
    resume: z.any(),
});

// 简历删除响应
export const resumeDeleteResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
});

// 简历统计响应
export const resumeStatsResponseSchema = z.object({
    success: z.literal(true),
    stats: z.object({
        total: z.number(),
        draft: z.number(),
        generated: z.number(),
        optimized: z.number(),
    }),
});

// 查询参数
export const resumeQuerySchema = z.object({
    userId: z.string().optional(),
    page: z.string().optional().default("1"),
    pageSize: z.string().optional().default("20"),
});

// 路由参数
export const resumeIdParamSchema = z.object({
    id: z.string(),
});
