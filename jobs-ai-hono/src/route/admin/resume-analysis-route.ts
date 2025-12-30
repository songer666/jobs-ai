import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { adminCors } from "../../lib/cors";
import { getDb } from "../../db";
import { ResumeAnalysisService } from "../../service/resume-service";
import { errorResponseSchema } from "../../schema/common-schema";
import {
    resumeAnalysisListResponseSchema,
    resumeAnalysisDetailResponseSchema,
    resumeAnalysisDeleteResponseSchema,
    resumeAnalysisStatsResponseSchema,
    resumeAnalysisQuerySchema,
    resumeAnalysisIdParamSchema,
} from "../../schema/admin/resume-analysis-schema";

const resumeAnalysisRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

resumeAnalysisRoute.use("/*", adminCors);

// 获取简历分析列表
const getAnalysesRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["Admin - Resume Analysis"],
    summary: "获取简历分析列表",
    request: {
        query: resumeAnalysisQuerySchema,
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: resumeAnalysisListResponseSchema,
                },
            },
            description: "成功获取简历分析列表",
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

resumeAnalysisRoute.openapi(getAnalysesRoute, async (c) => {
    const { userId, page = "1", pageSize = "20" } = c.req.query();
    const db = getDb(c.env);
    const service = new ResumeAnalysisService(db);

    try {
        let analyses;
        if (userId) {
            analyses = await service.findByUserId(userId);
        } else {
            const allAnalyses = await db.query.resumeAnalysis.findMany({
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
                orderBy: (resumeAnalysis, { desc }) => [desc(resumeAnalysis.createdAt)],
            });
            analyses = allAnalyses;
        }

        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const startIndex = (pageNum - 1) * pageSizeNum;
        const paginatedAnalyses = analyses.slice(startIndex, startIndex + pageSizeNum);

        // 转换 Date 为 timestamp
        const formattedAnalyses = paginatedAnalyses.map(a => ({
            ...a,
            createdAt: a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt,
            updatedAt: a.updatedAt instanceof Date ? a.updatedAt.getTime() : a.updatedAt,
        }));

        return c.json({
            success: true,
            analyses: formattedAnalyses,
            total: analyses.length,
            page: pageNum,
            pageSize: pageSizeNum,
        }, 200);
    } catch (error) {
        console.error("获取简历分析列表失败:", error);
        return c.json({
            success: false as const,
            message: "获取简历分析列表失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 获取简历分析详情
const getAnalysisByIdRoute = createRoute({
    method: "get",
    path: "/:id",
    tags: ["Admin - Resume Analysis"],
    summary: "获取简历分析详情",
    request: {
        params: resumeAnalysisIdParamSchema,
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: resumeAnalysisDetailResponseSchema,
                },
            },
            description: "成功获取简历分析详情",
        },
        404: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "简历分析不存在",
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

resumeAnalysisRoute.openapi(getAnalysisByIdRoute, async (c) => {
    const { id } = c.req.param();
    const db = getDb(c.env);

    try {
        const analysis = await db.query.resumeAnalysis.findFirst({
            where: (resumeAnalysis, { eq }) => eq(resumeAnalysis.id, id),
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

        if (!analysis) {
            return c.json({
                success: false as const,
                message: "简历分析不存在",
            }, 404);
        }

        // 转换 Date 为 timestamp
        const formattedAnalysis = {
            ...analysis,
            createdAt: analysis.createdAt instanceof Date ? analysis.createdAt.getTime() : analysis.createdAt,
            updatedAt: analysis.updatedAt instanceof Date ? analysis.updatedAt.getTime() : analysis.updatedAt,
        };

        return c.json({
            success: true,
            analysis: formattedAnalysis,
        }, 200);
    } catch (error) {
        console.error("获取简历分析详情失败:", error);
        return c.json({
            success: false as const,
            message: "获取简历分析详情失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 删除简历分析
const deleteAnalysisRoute = createRoute({
    method: "delete",
    path: "/:id",
    tags: ["Admin - Resume Analysis"],
    summary: "删除简历分析",
    request: {
        params: resumeAnalysisIdParamSchema,
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: resumeAnalysisDeleteResponseSchema,
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
            description: "简历分析不存在",
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

resumeAnalysisRoute.openapi(deleteAnalysisRoute, async (c) => {
    const { id } = c.req.param();
    const db = getDb(c.env);
    const service = new ResumeAnalysisService(db);

    try {
        const deleted = await service.delete(id);
        if (!deleted) {
            return c.json({
                success: false as const,
                message: "简历分析不存在",
            }, 404);
        }

        return c.json({
            success: true,
            message: "删除成功",
        }, 200);
    } catch (error) {
        console.error("删除简历分析失败:", error);
        return c.json({
            success: false as const,
            message: "删除简历分析失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 获取统计数据
const getAnalysisStatsRoute = createRoute({
    method: "get",
    path: "/stats/overview",
    tags: ["Admin - Resume Analysis"],
    summary: "获取简历分析统计数据",
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: resumeAnalysisStatsResponseSchema,
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

resumeAnalysisRoute.openapi(getAnalysisStatsRoute, async (c) => {
    const db = getDb(c.env);

    try {
        const allAnalyses = await db.query.resumeAnalysis.findMany();
        
        const total = allAnalyses.length;
        const scoresSum = allAnalyses.reduce((sum, a) => sum + (a.score || 0), 0);
        const avgScore = total > 0 ? Math.round(scoresSum / total) : 0;

        return c.json({
            success: true,
            stats: {
                total,
                avgScore,
            },
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

export default resumeAnalysisRoute;
