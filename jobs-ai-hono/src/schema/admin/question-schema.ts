import { z } from "zod";

// 题目难度枚举
export const questionDifficultyEnum = z.enum(["easy", "medium", "hard"]);

// 题目列表响应
export const questionListResponseSchema = z.object({
    success: z.literal(true),
    questions: z.array(z.any()),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
});

// 题目详情响应
export const questionDetailResponseSchema = z.object({
    success: z.literal(true),
    question: z.any(),
});

// 题目删除响应
export const questionDeleteResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
});

// 题目统计响应
export const questionStatsResponseSchema = z.object({
    success: z.literal(true),
    stats: z.object({
        total: z.number(),
        easy: z.number(),
        medium: z.number(),
        hard: z.number(),
    }),
});

// 查询参数
export const questionQuerySchema = z.object({
    userId: z.string().optional(),
    page: z.string().optional().default("1"),
    pageSize: z.string().optional().default("20"),
});

// 路由参数
export const questionIdParamSchema = z.object({
    id: z.string(),
});
