import { z } from "zod";

// Dashboard 统计响应
export const dashboardStatsResponseSchema = z.object({
    success: z.literal(true),
    stats: z.object({
        totalUsers: z.number(),
        totalInterviews: z.number(),
        totalResumes: z.number(),
        totalQuestions: z.number(),
        totalResumeAnalyses: z.number(),
        totalContacts: z.number(),
    }),
    recentContacts: z.array(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        message: z.string(),
        createdAt: z.number(),
    })),
    recentUsers: z.array(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        createdAt: z.number(),
    })),
});
