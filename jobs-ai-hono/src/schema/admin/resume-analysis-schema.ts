import { z } from "zod";

// 简历分析列表响应
export const resumeAnalysisListResponseSchema = z.object({
    success: z.literal(true),
    analyses: z.array(z.any()),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
});

// 简历分析详情响应
export const resumeAnalysisDetailResponseSchema = z.object({
    success: z.literal(true),
    analysis: z.any(),
});

// 简历分析删除响应
export const resumeAnalysisDeleteResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
});

// 简历分析统计响应
export const resumeAnalysisStatsResponseSchema = z.object({
    success: z.literal(true),
    stats: z.object({
        total: z.number(),
        avgScore: z.number(),
    }),
});

// 查询参数
export const resumeAnalysisQuerySchema = z.object({
    userId: z.string().optional(),
    page: z.string().optional().default("1"),
    pageSize: z.string().optional().default("20"),
});

// 路由参数
export const resumeAnalysisIdParamSchema = z.object({
    id: z.string(),
});
