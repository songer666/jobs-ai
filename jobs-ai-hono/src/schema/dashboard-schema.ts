import { z } from "zod";

// Dashboard 统计数据
export const dashboardStatsSchema = z.object({
    interviewCount: z.number(),
    resumeCount: z.number(),
    analysisCount: z.number(),
    questionCount: z.number(),
});

// Dashboard 使用量
export const dashboardUsageItemSchema = z.object({
    used: z.number(),
    limit: z.number(),
});

export const dashboardUsageSchema = z.object({
    interview: dashboardUsageItemSchema,
    generate: dashboardUsageItemSchema,
    analyze: dashboardUsageItemSchema,
    question: dashboardUsageItemSchema,
});

// Dashboard 最近活动
export const dashboardActivitySchema = z.object({
    type: z.enum(['interview', 'resume', 'analysis', 'question']),
    id: z.string(),
    title: z.string(),
    date: z.number(),
    score: z.number().nullable(),
});

// Dashboard 完整数据
export const dashboardDataSchema = z.object({
    stats: dashboardStatsSchema,
    usage: dashboardUsageSchema,
    recentActivities: z.array(dashboardActivitySchema),
});

// Dashboard 响应
export const dashboardResponseSchema = z.object({
    success: z.literal(true),
    data: dashboardDataSchema,
});
