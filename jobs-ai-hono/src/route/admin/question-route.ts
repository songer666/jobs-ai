import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { adminCors } from "../../lib/cors";
import { getDb } from "../../db";
import { QuestionService } from "../../service/question-service";
import { errorResponseSchema } from "../../schema/common-schema";
import {
    questionListResponseSchema,
    questionDetailResponseSchema,
    questionDeleteResponseSchema,
    questionStatsResponseSchema,
    questionQuerySchema,
    questionIdParamSchema,
} from "../../schema/admin/question-schema";

const questionRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

questionRoute.use("/*", adminCors);

// 获取题目列表
const getQuestionsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["Admin - Question"],
    summary: "获取题目列表",
    request: {
        query: questionQuerySchema,
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: questionListResponseSchema,
                },
            },
            description: "成功获取题目列表",
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

questionRoute.openapi(getQuestionsRoute, async (c) => {
    const { userId, page = "1", pageSize = "20" } = c.req.query();
    const db = getDb(c.env);
    const service = new QuestionService(db);

    try {
        let questions;
        if (userId) {
            questions = await service.findByUserId(userId);
        } else {
            const allQuestions = await db.query.question.findMany({
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    jobInfo: {
                        columns: {
                            id: true,
                            name: true,
                            title: true,
                        },
                    },
                },
                orderBy: (question, { desc }) => [desc(question.createdAt)],
            });
            questions = allQuestions;
        }

        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const startIndex = (pageNum - 1) * pageSizeNum;
        const paginatedQuestions = questions.slice(startIndex, startIndex + pageSizeNum);

        return c.json({
            success: true,
            questions: paginatedQuestions,
            total: questions.length,
            page: pageNum,
            pageSize: pageSizeNum,
        }, 200);
    } catch (error) {
        console.error("获取题目列表失败:", error);
        return c.json({
            success: false as const,
            message: "获取题目列表失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 获取题目详情
const getQuestionByIdRoute = createRoute({
    method: "get",
    path: "/:id",
    tags: ["Admin - Question"],
    summary: "获取题目详情",
    request: {
        params: questionIdParamSchema,
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: questionDetailResponseSchema,
                },
            },
            description: "成功获取题目详情",
        },
        404: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "题目不存在",
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

questionRoute.openapi(getQuestionByIdRoute, async (c) => {
    const { id } = c.req.param();
    const db = getDb(c.env);

    try {
        const question = await db.query.question.findFirst({
            where: (question, { eq }) => eq(question.id, id),
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                jobInfo: true,
            },
        });

        if (!question) {
            return c.json({
                success: false as const,
                message: "题目不存在",
            }, 404);
        }

        return c.json({
            success: true,
            question,
        }, 200);
    } catch (error) {
        console.error("获取题目详情失败:", error);
        return c.json({
            success: false as const,
            message: "获取题目详情失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 删除题目
const deleteQuestionRoute = createRoute({
    method: "delete",
    path: "/:id",
    tags: ["Admin - Question"],
    summary: "删除题目",
    request: {
        params: questionIdParamSchema,
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: questionDeleteResponseSchema,
                },
            },
            description: "删除成功",
        },
        404: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "题目不存在",
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

questionRoute.openapi(deleteQuestionRoute, async (c) => {
    const { id } = c.req.param();
    const db = getDb(c.env);
    const service = new QuestionService(db);

    try {
        const deleted = await service.delete(id);
        if (!deleted) {
            return c.json({
                success: false as const,
                message: "题目不存在",
            }, 404);
        }

        return c.json({
            success: true,
            message: "删除成功",
        }, 200);
    } catch (error) {
        console.error("删除题目失败:", error);
        return c.json({
            success: false as const,
            message: "删除题目失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 获取统计数据
const getQuestionStatsRoute = createRoute({
    method: "get",
    path: "/stats/overview",
    tags: ["Admin - Question"],
    summary: "获取题目统计数据",
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: questionStatsResponseSchema,
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

questionRoute.openapi(getQuestionStatsRoute, async (c) => {
    const db = getDb(c.env);

    try {
        const allQuestions = await db.query.question.findMany();
        
        const stats = {
            total: allQuestions.length,
            easy: allQuestions.filter(q => q.difficulty === 'easy').length,
            medium: allQuestions.filter(q => q.difficulty === 'medium').length,
            hard: allQuestions.filter(q => q.difficulty === 'hard').length,
        };

        return c.json({
            success: true,
            stats,
        }, 200);
    } catch (error) {
        console.error("获取统计数据失败:", error);
        return c.json({
            success: false as const,
            message: "获取统计数据失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

export default questionRoute;
