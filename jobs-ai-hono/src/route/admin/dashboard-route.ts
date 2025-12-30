import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { adminCors } from "../../lib/cors";
import { getDb } from "../../db";
import { contactMessage } from "../../db/schema/contact-schema";
import { errorResponseSchema } from "../../schema/common-schema";
import { dashboardStatsResponseSchema } from "../../schema/admin/dashboard-schema";
import { desc } from "drizzle-orm";

const dashboardRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

dashboardRoute.use("/*", adminCors);

// 获取 Dashboard 统计数据
const getDashboardStatsRoute = createRoute({
    method: "get",
    path: "/stats",
    tags: ["Admin - Dashboard"],
    summary: "获取 Dashboard 统计数据",
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: dashboardStatsResponseSchema,
                },
            },
            description: "成功获取统计数据",
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

dashboardRoute.openapi(getDashboardStatsRoute, async (c) => {
    const db = getDb(c.env);

    try {
        // 并行获取所有统计数据
        const [allUsers, allInterviews, allResumes, allQuestions, allResumeAnalyses, allContacts] = await Promise.all([
            db.query.user.findMany({
                orderBy: (user: any, { desc: descFn }: any) => [descFn(user.createdAt)],
            }),
            db.query.interview.findMany(),
            db.query.resume.findMany(),
            db.query.question.findMany(),
            db.query.resumeAnalysis.findMany(),
            db.select().from(contactMessage).orderBy(desc(contactMessage.createdAt)),
        ]);

        // 统计数据
        const stats = {
            totalUsers: allUsers.length,
            totalInterviews: allInterviews.length,
            totalResumes: allResumes.length,
            totalQuestions: allQuestions.length,
            totalResumeAnalyses: allResumeAnalyses.length,
            totalContacts: allContacts.length,
        };

        // 最近5条联系消息
        const recentContacts = allContacts.slice(0, 5).map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            message: c.message,
            createdAt: c.createdAt instanceof Date ? c.createdAt.getTime() : c.createdAt,
        }));

        // 最近5个新增用户
        const recentUsers = allUsers.slice(0, 5).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt instanceof Date ? u.createdAt.getTime() : u.createdAt,
        }));

        return c.json({
            success: true,
            stats,
            recentContacts,
            recentUsers,
        }, 200);
    } catch (error) {
        console.error("获取 Dashboard 统计数据失败:", error);
        return c.json({
            success: false as const,
            message: "获取统计数据失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

export default dashboardRoute;
