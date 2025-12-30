import { z } from "zod";
import {
    dashboardStatsSchema,
    dashboardUsageSchema,
    dashboardUsageItemSchema,
    dashboardActivitySchema,
    dashboardDataSchema,
} from "../schema/dashboard-schema";

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type DashboardUsageItem = z.infer<typeof dashboardUsageItemSchema>;
export type DashboardUsage = z.infer<typeof dashboardUsageSchema>;
export type DashboardActivity = z.infer<typeof dashboardActivitySchema>;
export type DashboardData = z.infer<typeof dashboardDataSchema>;
