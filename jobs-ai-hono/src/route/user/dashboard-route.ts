import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware } from "../../lib/auth-middleware";
import { getDb } from "../../db";
import { createRedis } from "../../lib/redis";
import { nextCors } from "../../lib/cors";
import { DashboardService } from "../../service/dashboard-service";
import { dashboardResponseSchema } from "../../schema/dashboard-schema";
import { errorResponseSchema } from "../../schema/common-schema";

type Variables = {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
        [key: string]: unknown;
    };
};

const dashboardRoute = new OpenAPIHono<{ Bindings: CloudflareBindings; Variables: Variables }>();

dashboardRoute.use("/*", nextCors);

// ==================== 获取 Dashboard 聚合数据 ====================
const getDashboardDataRoute = createRoute({
    method: "get",
    path: "/data",
    tags: ["Dashboard"],
    summary: "获取 Dashboard 聚合数据",
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: dashboardResponseSchema,
                },
            },
            description: "获取成功",
        },
        401: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "未登录",
        },
        500: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "服务器错误",
        },
    },
});

dashboardRoute.use(getDashboardDataRoute.getRoutingPath(), authMiddleware);
dashboardRoute.openapi(getDashboardDataRoute, async (c) => {
    const user = c.get("user");
    const db = getDb(c.env);
    const redis = createRedis(c.env);
    const service = new DashboardService(db);
    const userRole = user.role as string || 'user';

    try {
        const data = await service.getDashboardData(user.id, redis, userRole);

        return c.json({
            success: true,
            data,
        }, 200);
    } catch (error) {
        console.error("获取 Dashboard 数据失败:", error);
        return c.json({
            success: false,
            message: "获取数据失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

export default dashboardRoute;
