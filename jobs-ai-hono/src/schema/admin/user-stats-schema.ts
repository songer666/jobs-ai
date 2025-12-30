import { z } from "zod";

// 用户统计响应
export const userStatsResponseSchema = z.object({
    success: z.literal(true),
    stats: z.object({
        totalUsers: z.number(),
        normalUsers: z.number(),
        adminUsers: z.number(),
    }),
});
