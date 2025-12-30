import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { adminCors } from "../../lib/cors";
import { adminAuthMiddleware } from "../../lib/auth-middleware";
import { getDb } from "../../db";
import { InterviewService } from "../../service/interview-service";
import { successResponseSchema, errorResponseSchema } from "../../schema/common-schema";

const interviewRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

interviewRoute.use("/*", adminCors);
// Admin 认证中间件
interviewRoute.use("/*", adminAuthMiddleware);

const getInterviewsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["Admin - Interview"],
    summary: "获取所有面试记录",
    request: {
        query: z.object({
            userId: z.string().optional(),
            page: z.string().optional(),
            pageSize: z.string().optional(),
        }),
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        interviews: z.array(z.any()),
                        total: z.number(),
                        page: z.number(),
                        pageSize: z.number(),
                    }),
                },
            },
            description: "成功获取面试列表",
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

interviewRoute.openapi(getInterviewsRoute, async (c) => {
    const { userId, page = "1", pageSize = "20" } = c.req.query();
    const db = getDb(c.env);
    const service = new InterviewService(db);

    try {
        let interviews;
        if (userId) {
            interviews = await service.findByUserId(userId);
        } else {
            const allInterviews = await db.query.interview.findMany({
                with: {
                    jobInfo: true,
                    user: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: (interview, { desc }) => [desc(interview.createdAt)],
            });
            interviews = allInterviews;
        }

        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const start = (pageNum - 1) * pageSizeNum;
        const end = start + pageSizeNum;
        const paginatedInterviews = interviews.slice(start, end);

        return c.json({
            success: true,
            interviews: paginatedInterviews,
            total: interviews.length,
            page: pageNum,
            pageSize: pageSizeNum,
        }, 200);
    } catch (error) {
        console.error("获取面试列表失败:", error);
        return c.json({
            success: false,
            message: "获取面试列表失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 获取面试详情
const getInterviewByIdRoute = createRoute({
    method: "get",
    path: "/:id",
    tags: ["Admin - Interview"],
    summary: "获取面试详情",
    request: {
        params: z.object({
            id: z.string(),
        }),
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        interview: z.any(),
                    }),
                },
            },
            description: "成功获取面试详情",
        },
        404: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "面试不存在",
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

interviewRoute.openapi(getInterviewByIdRoute, async (c) => {
    const { id } = c.req.param();
    const db = getDb(c.env);
    const service = new InterviewService(db);

    try {
        const interview = await service.findByIdWithJobInfo(id);
        if (!interview) {
            return c.json({
                success: false,
                message: "面试不存在",
            }, 404);
        }

        const messages = await service.getChatMessages(id);

        return c.json({
            success: true,
            interview: {
                ...interview,
                messages,
            },
        }, 200);
    } catch (error) {
        console.error("获取面试详情失败:", error);
        return c.json({
            success: false,
            message: "获取面试详情失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

const deleteInterviewRoute = createRoute({
    method: "delete",
    path: "/:id",
    tags: ["Admin - Interview"],
    summary: "删除面试记录",
    request: {
        params: z.object({
            id: z.string(),
        }),
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: successResponseSchema,
                },
            },
            description: "删除成功",
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

interviewRoute.openapi(deleteInterviewRoute, async (c) => {
    const { id } = c.req.param();
    const db = getDb(c.env);
    const service = new InterviewService(db);

    try {
        await service.clearChatMessages(id);
        await service.delete(id);

        return c.json({
            success: true,
            message: "删除成功",
        }, 200);
    } catch (error) {
        console.error("删除面试失败:", error);
        return c.json({
            success: false,
            message: "删除面试失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 获取统计数据
const getInterviewStatsRoute = createRoute({
    method: "get",
    path: "/stats/overview",
    tags: ["Admin - Interview"],
    summary: "获取面试统计数据",
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        stats: z.object({
                            total: z.number(),
                            today: z.number(),
                            completed: z.number(),
                            avgScore: z.number().nullable(),
                        }),
                    }),
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

interviewRoute.openapi(getInterviewStatsRoute, async (c) => {
    const db = getDb(c.env);

    try {
        const allInterviews = await db.query.interview.findMany();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayInterviews = allInterviews.filter(i => {
            const createdAt = new Date(i.createdAt);
            return createdAt >= today;
        });

        const completedInterviews = allInterviews.filter(i => i.status === 'completed');
        const scoresSum = completedInterviews.reduce((sum, i) => sum + (i.score || 0), 0);
        const avgScore = completedInterviews.length > 0 ? scoresSum / completedInterviews.length : null;

        return c.json({
            success: true,
            stats: {
                total: allInterviews.length,
                today: todayInterviews.length,
                completed: completedInterviews.length,
                avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
            },
        }, 200);
    } catch (error) {
        console.error("获取统计数据失败:", error);
        return c.json({
            success: false,
            message: "获取统计数据失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

export default interviewRoute;
