import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { adminCors } from "../../lib/cors";
import { getDb } from "../../db";
import { ResumeService } from "../../service/resume-service";
import { errorResponseSchema } from "../../schema/common-schema";
import {
    resumeListResponseSchema,
    resumeDetailResponseSchema,
    resumeDeleteResponseSchema,
    resumeStatsResponseSchema,
    resumeQuerySchema,
    resumeIdParamSchema,
} from "../../schema/admin/resume-schema";

const resumeRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

resumeRoute.use("/*", adminCors);

// 获取简历列表
const getResumesRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["Admin - Resume"],
    summary: "获取简历列表",
    request: {
        query: resumeQuerySchema,
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: resumeListResponseSchema,
                },
            },
            description: "成功获取简历列表",
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

resumeRoute.openapi(getResumesRoute, async (c) => {
    const { userId, page = "1", pageSize = "20" } = c.req.query();
    const db = getDb(c.env);
    const service = new ResumeService(db);

    try {
        let resumes;
        if (userId) {
            resumes = await service.findByUserId(userId);
        } else {
            const allResumes = await db.query.resume.findMany({
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
                orderBy: (resume, { desc }) => [desc(resume.createdAt)],
            });
            resumes = allResumes;
        }

        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const startIndex = (pageNum - 1) * pageSizeNum;
        const paginatedResumes = resumes.slice(startIndex, startIndex + pageSizeNum);

        return c.json({
            success: true,
            resumes: paginatedResumes,
            total: resumes.length,
            page: pageNum,
            pageSize: pageSizeNum,
        }, 200);
    } catch (error) {
        console.error("获取简历列表失败:", error);
        return c.json({
            success: false as const,
            message: "获取简历列表失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 获取简历详情
const getResumeByIdRoute = createRoute({
    method: "get",
    path: "/:id",
    tags: ["Admin - Resume"],
    summary: "获取简历详情",
    request: {
        params: resumeIdParamSchema,
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: resumeDetailResponseSchema,
                },
            },
            description: "成功获取简历详情",
        },
        404: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "简历不存在",
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

resumeRoute.openapi(getResumeByIdRoute, async (c) => {
    const { id } = c.req.param();
    const db = getDb(c.env);

    try {
        const resume = await db.query.resume.findFirst({
            where: (resume, { eq }) => eq(resume.id, id),
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

        if (!resume) {
            return c.json({
                success: false as const,
                message: "简历不存在",
            }, 404);
        }

        return c.json({
            success: true,
            resume,
        }, 200);
    } catch (error) {
        console.error("获取简历详情失败:", error);
        return c.json({
            success: false as const,
            message: "获取简历详情失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 删除简历
const deleteResumeRoute = createRoute({
    method: "delete",
    path: "/:id",
    tags: ["Admin - Resume"],
    summary: "删除简历",
    request: {
        params: resumeIdParamSchema,
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: resumeDeleteResponseSchema,
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
            description: "简历不存在",
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

resumeRoute.openapi(deleteResumeRoute, async (c) => {
    const { id } = c.req.param();
    const db = getDb(c.env);
    const service = new ResumeService(db);

    try {
        const deleted = await service.delete(id);
        if (!deleted) {
            return c.json({
                success: false as const,
                message: "简历不存在",
            }, 404);
        }

        return c.json({
            success: true,
            message: "删除成功",
        }, 200);
    } catch (error) {
        console.error("删除简历失败:", error);
        return c.json({
            success: false as const,
            message: "删除简历失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 获取统计数据
const getResumeStatsRoute = createRoute({
    method: "get",
    path: "/stats/overview",
    tags: ["Admin - Resume"],
    summary: "获取简历统计数据",
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: resumeStatsResponseSchema,
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

resumeRoute.openapi(getResumeStatsRoute, async (c) => {
    const db = getDb(c.env);

    try {
        const allResumes = await db.query.resume.findMany();
        
        const stats = {
            total: allResumes.length,
            draft: allResumes.filter(r => r.status === 'draft').length,
            generated: allResumes.filter(r => r.status === 'generated').length,
            optimized: allResumes.filter(r => r.status === 'optimized').length,
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

export default resumeRoute;
