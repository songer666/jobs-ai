import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { nextCors } from "../../lib/cors";
import { authMiddleware } from "../../lib/auth-middleware";
import { InterviewService } from "../../service/interview-service";
import { getDb } from "../../db";
import { createRedis } from "../../lib/redis";
import { checkInterviewRateLimit, incrementInterviewCount, getInterviewUsage } from "../../lib/rate-limit";
import {
    createInterviewRequestSchema,
    updateInterviewRequestSchema,
    interviewResponseSchema,
    interviewListResponseSchema,
    rateLimitResponseSchema,
    errorResponseSchema,
} from "../../schema/interview-schema";
import interviewAiRoute from "./interview-ai-route";

type Variables = {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
        [key: string]: unknown;
    };
};

const interviewRoute = new OpenAPIHono<{ Bindings: CloudflareBindings; Variables: Variables }>();

interviewRoute.use("/*", nextCors);

// 获取今日使用量
const getUsageRoute = createRoute({
    method: "get",
    path: "/usage",
    tags: ["User - Interview"],
    summary: "获取今日 AI 面试使用量",
    responses: {
        200: {
            content: { "application/json": { schema: rateLimitResponseSchema } },
            description: "获取成功",
        },
        401: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未登录",
        },
    },
});

interviewRoute.use(getUsageRoute.getRoutingPath(), authMiddleware);
interviewRoute.openapi(getUsageRoute, async (c) => {
    const user = c.get("user");
    const redis = createRedis(c.env);
    const usage = await getInterviewUsage(redis, user.id, user.role as string);
    return c.json({ success: true, usage }, 200);
});

// 获取我的面试列表
const getMyInterviewsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["User - Interview"],
    summary: "获取我的面试列表",
    responses: {
        200: {
            content: { "application/json": { schema: interviewListResponseSchema } },
            description: "获取成功",
        },
        401: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未登录",
        },
    },
});

interviewRoute.use(getMyInterviewsRoute.getRoutingPath(), authMiddleware);
interviewRoute.openapi(getMyInterviewsRoute, async (c) => {
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const user = c.get("user");

    const interviews = await service.findByUserId(user.id);
    const formattedInterviews = interviews.map(i => ({
        ...i,
        createdAt: i.createdAt.getTime(),
        updatedAt: i.updatedAt.getTime(),
    }));
    return c.json({ success: true, interviews: formattedInterviews }, 200);
});

// 获取单个面试详情
const getInterviewRoute = createRoute({
    method: "get",
    path: "/{id}",
    tags: ["User - Interview"],
    summary: "获取面试详情",
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            content: { "application/json": { schema: interviewResponseSchema } },
            description: "获取成功",
        },
        401: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未登录",
        },
        403: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "无权访问",
        },
        404: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未找到",
        },
    },
});

interviewRoute.use(getInterviewRoute.getRoutingPath(), authMiddleware);
interviewRoute.openapi(getInterviewRoute, async (c) => {
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const canAccess = await service.canUserAccess(id, user.id);
    if (!canAccess) {
        const interview = await service.findById(id);
        if (!interview) {
            return c.json({ success: false, message: "面试记录不存在" }, 404);
        }
        return c.json({ success: false, message: "无权访问此面试记录" }, 403);
    }

    const interview = await service.findByIdWithJobInfo(id);
    const formattedInterview = interview ? {
        ...interview,
        createdAt: interview.createdAt.getTime(),
        updatedAt: interview.updatedAt.getTime(),
    } : null;
    return c.json({ success: true, interview: formattedInterview }, 200);
});

// 创建面试（检查限流）
const createInterviewRoute = createRoute({
    method: "post",
    path: "/",
    tags: ["User - Interview"],
    summary: "创建新面试",
    request: {
        body: {
            content: {
                "application/json": { schema: createInterviewRequestSchema },
            },
        },
    },
    responses: {
        201: {
            content: { "application/json": { schema: interviewResponseSchema } },
            description: "创建成功",
        },
        401: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未登录",
        },
        429: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "今日次数已用完",
        },
        500: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "创建失败",
        },
    },
});

interviewRoute.use(createInterviewRoute.getRoutingPath(), authMiddleware);
interviewRoute.openapi(createInterviewRoute, async (c) => {
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const user = c.get("user");
    const body = c.req.valid("json");
    const redis = createRedis(c.env);

    // 检查限流
    const rateLimit = await checkInterviewRateLimit(redis, user.id, user.role as string);
    if (!rateLimit.allowed) {
        return c.json({ 
            success: false, 
            message: rateLimit.message,
            usage: {
                used: 10,
                limit: 10,
                remaining: 0,
            }
        }, 429);
    }

    try {
        /**
         * 注意：不在这里增加计数
         * 计数应该在开始面试计时时增加，因为：
         * 1. 只有真正开始面试才应该计数
         * 2. 如果 QStash 创建失败，不应该计数
         * 3. 用户可能创建面试但不开始
         */
        const interview = await service.create({
            userId: user.id,
            jobInfoId: body.jobInfoId,
            language: body.language,
            model: body.model,
        });
        
        const formattedInterview = {
            ...interview,
            createdAt: interview.createdAt.getTime(),
            updatedAt: interview.updatedAt.getTime(),
        };
        return c.json({ success: true, interview: formattedInterview, message: "创建成功" }, 201);
    } catch (error) {
        return c.json({
            success: false,
            message: "创建失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 更新面试
const updateInterviewRoute = createRoute({
    method: "put",
    path: "/{id}",
    tags: ["User - Interview"],
    summary: "更新面试",
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: {
                "application/json": { schema: updateInterviewRequestSchema },
            },
        },
    },
    responses: {
        200: {
            content: { "application/json": { schema: interviewResponseSchema } },
            description: "更新成功",
        },
        401: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未登录",
        },
        403: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "无权修改",
        },
        404: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未找到",
        },
    },
});

interviewRoute.use(updateInterviewRoute.getRoutingPath(), authMiddleware);
interviewRoute.openapi(updateInterviewRoute, async (c) => {
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const canAccess = await service.canUserAccess(id, user.id);
    if (!canAccess) {
        const interview = await service.findById(id);
        if (!interview) {
            return c.json({ success: false, message: "面试记录不存在" }, 404);
        }
        return c.json({ success: false, message: "无权修改此面试记录" }, 403);
    }

    const interview = await service.update(id, body);
    const formattedInterview = interview ? {
        ...interview,
        createdAt: interview.createdAt.getTime(),
        updatedAt: interview.updatedAt.getTime(),
    } : null;
    return c.json({ success: true, interview: formattedInterview, message: "更新成功" }, 200);
});

// 删除面试
const deleteInterviewRoute = createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["User - Interview"],
    summary: "删除面试",
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            content: { "application/json": { schema: interviewResponseSchema } },
            description: "删除成功",
        },
        401: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未登录",
        },
        403: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "无权删除",
        },
        404: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未找到",
        },
    },
});

interviewRoute.use(deleteInterviewRoute.getRoutingPath(), authMiddleware);
interviewRoute.openapi(deleteInterviewRoute, async (c) => {
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const canAccess = await service.canUserAccess(id, user.id);
    if (!canAccess) {
        const interview = await service.findById(id);
        if (!interview) {
            return c.json({ success: false, message: "面试记录不存在" }, 404);
        }
        return c.json({ success: false, message: "无权删除此面试记录" }, 403);
    }

    const interview = await service.delete(id);
    const formattedInterview = interview ? {
        ...interview,
        createdAt: interview.createdAt.getTime(),
        updatedAt: interview.updatedAt.getTime(),
    } : null;
    return c.json({ success: true, interview: formattedInterview, message: "删除成功" }, 200);
});

// 合并 AI 相关路由
interviewRoute.route("/", interviewAiRoute);

export default interviewRoute;
