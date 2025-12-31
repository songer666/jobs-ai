import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { streamText } from "ai";
import { nextCors } from "../../lib/cors";
import { authMiddleware } from "../../lib/auth-middleware";
import { QuestionService } from "../../service/question-service";
import { getDb } from "../../db";
import { createRedis } from "../../lib/redis";
import { createAIModels } from "../../lib/ai";
import {
    generateQuestionRequestSchema,
    submitAnswerRequestSchema,
    questionResponseSchema,
    questionListResponseSchema,
    questionUsageResponseSchema,
    errorResponseSchema,
} from "../../schema/question-schema";
import {
    getQuestionGenerationPrompt,
    getQuestionFeedbackPrompt,
    parseScoreFromFeedback,
    type QuestionDifficulty,
} from "../../lib/prompt/question-prompt";
import { JobInfoService } from "../../service/job-info-service";

type Variables = {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
        [key: string]: unknown;
    };
};

const QUESTION_RATE_LIMIT_PREFIX = 'rate_limit:question:';
const FREE_USER_DAILY_QUESTION_LIMIT = 20;

function getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

async function checkQuestionRateLimit(
    redis: any,
    userId: string,
    userRole: string = 'user'
) {
    if (userRole === 'admin' || userRole === 'premium') {
        return { allowed: true, remaining: -1 };
    }

    const todayKey = getTodayKey();
    const key = `${QUESTION_RATE_LIMIT_PREFIX}${userId}:${todayKey}`;
    const count = (await redis.get(key) as number) || 0;

    if (count >= FREE_USER_DAILY_QUESTION_LIMIT) {
        return {
            allowed: false,
            remaining: 0,
            message: `今日题目练习次数已用完（${FREE_USER_DAILY_QUESTION_LIMIT}题/天），请明天再试`,
        };
    }

    return {
        allowed: true,
        remaining: FREE_USER_DAILY_QUESTION_LIMIT - count,
    };
}

async function incrementQuestionCount(redis: any, userId: string) {
    const todayKey = getTodayKey();
    const key = `${QUESTION_RATE_LIMIT_PREFIX}${userId}:${todayKey}`;
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, getSecondsUntilMidnight());
    }
    return count;
}

async function getQuestionUsage(redis: any, userId: string, userRole: string = 'user') {
    if (userRole === 'admin' || userRole === 'premium') {
        return { used: 0, limit: -1, remaining: -1 };
    }
    const todayKey = getTodayKey();
    const key = `${QUESTION_RATE_LIMIT_PREFIX}${userId}:${todayKey}`;
    const count = (await redis.get(key) as number) || 0;
    return {
        used: count,
        limit: FREE_USER_DAILY_QUESTION_LIMIT,
        remaining: Math.max(0, FREE_USER_DAILY_QUESTION_LIMIT - count),
    };
}

const questionRoute = new OpenAPIHono<{ Bindings: CloudflareBindings; Variables: Variables }>();

questionRoute.use("/*", nextCors);

// 获取今日使用量
const getUsageRoute = createRoute({
    method: "get",
    path: "/usage",
    tags: ["User - Question"],
    summary: "获取今日题目练习使用量",
    responses: {
        200: {
            content: { "application/json": { schema: questionUsageResponseSchema } },
            description: "获取成功",
        },
        401: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未登录",
        },
    },
});

questionRoute.use(getUsageRoute.getRoutingPath(), authMiddleware);
questionRoute.openapi(getUsageRoute, async (c) => {
    const user = c.get("user");
    const redis = createRedis(c.env);
    const usage = await getQuestionUsage(redis, user.id, user.role as string);
    return c.json({ success: true, usage }, 200);
});

// 获取我的题目列表
const getMyQuestionsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["User - Question"],
    summary: "获取我的题目列表",
    request: {
        query: z.object({
            jobInfoId: z.string().optional(),
        }),
    },
    responses: {
        200: {
            content: { "application/json": { schema: questionListResponseSchema } },
            description: "获取成功",
        },
        401: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未登录",
        },
    },
});

questionRoute.use(getMyQuestionsRoute.getRoutingPath(), authMiddleware);
questionRoute.openapi(getMyQuestionsRoute, async (c) => {
    const db = getDb(c.env);
    const service = new QuestionService(db);
    const user = c.get("user");
    const { jobInfoId } = c.req.valid("query");

    let questions;
    if (jobInfoId) {
        questions = await service.findByJobInfoId(user.id, jobInfoId);
    } else {
        questions = await service.findByUserId(user.id);
    }

    const formattedQuestions = questions.map(q => ({
        ...q,
        createdAt: q.createdAt.getTime(),
        updatedAt: q.updatedAt.getTime(),
    }));
    return c.json({ success: true, questions: formattedQuestions }, 200);
});

// 获取单个题目详情
const getQuestionRoute = createRoute({
    method: "get",
    path: "/{id}",
    tags: ["User - Question"],
    summary: "获取题目详情",
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            content: { "application/json": { schema: questionResponseSchema } },
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

questionRoute.use(getQuestionRoute.getRoutingPath(), authMiddleware);
questionRoute.openapi(getQuestionRoute, async (c) => {
    const db = getDb(c.env);
    const service = new QuestionService(db);
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const canAccess = await service.canUserAccess(id, user.id);
    if (!canAccess) {
        const question = await service.findById(id);
        if (!question) {
            return c.json({ success: false, message: "题目不存在" }, 404);
        }
        return c.json({ success: false, message: "无权访问此题目" }, 403);
    }

    const question = await service.findByIdWithJobInfo(id);
    const formattedQuestion = question ? {
        ...question,
        createdAt: question.createdAt.getTime(),
        updatedAt: question.updatedAt.getTime(),
    } : null;
    return c.json({ success: true, question: formattedQuestion }, 200);
});

// 生成新题目（流式）
const generateQuestionRoute = createRoute({
    method: "post",
    path: "/generate",
    tags: ["User - Question"],
    summary: "AI 生成新题目",
    request: {
        body: {
            content: {
                "application/json": { schema: generateQuestionRequestSchema },
            },
        },
    },
    responses: {
        200: {
            content: { "text/event-stream": { schema: z.any() } },
            description: "流式返回题目",
        },
        401: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "未登录",
        },
        429: {
            content: { "application/json": { schema: errorResponseSchema } },
            description: "今日次数已用完",
        },
    },
});

questionRoute.use(generateQuestionRoute.getRoutingPath(), authMiddleware);
questionRoute.openapi(generateQuestionRoute, async (c) => {
    const db = getDb(c.env);
    const questionService = new QuestionService(db);
    const jobInfoService = new JobInfoService(db);
    const user = c.get("user");
    const body = c.req.valid("json");
    const redis = createRedis(c.env);

    // 检查限流
    const rateLimit = await checkQuestionRateLimit(redis, user.id, user.role as string);
    if (!rateLimit.allowed) {
        return c.json({ success: false, message: rateLimit.message }, 429);
    }

    // 获取职位信息
    const jobInfoData = await jobInfoService.findById(body.jobInfoId);
    if (!jobInfoData) {
        return c.json({ success: false, message: "职位信息不存在" }, 404);
    }

    // 获取之前的问题（避免重复）
    const previousQuestions = await questionService.getPreviousQuestions(
        user.id,
        body.jobInfoId,
        10
    );

    const language = body.language || 'zh';
    const modelChoice = body.model || 'gemini';

    const systemPrompt = getQuestionGenerationPrompt(
        {
            title: jobInfoData.title,
            description: jobInfoData.description,
            experienceLevel: jobInfoData.experienceLevel,
        },
        body.difficulty as QuestionDifficulty,
        previousQuestions.map(q => ({
            text: q.text,
            difficulty: q.difficulty as QuestionDifficulty,
        })),
        language
    );

    const models = createAIModels(c.env);
    const model = models.deepseek;
    let fullText = '';

    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const result = streamText({
                    model,
                    system: systemPrompt,
                    prompt: `Generate a ${body.difficulty} difficulty question now.`,
                    onFinish: async ({ text }) => {
                        fullText = text;
                        // 增加计数
                        await incrementQuestionCount(redis, user.id);
                        // 保存题目
                        const newQuestion = await questionService.create({
                            userId: user.id,
                            jobInfoId: body.jobInfoId,
                            text: fullText,
                            difficulty: body.difficulty as QuestionDifficulty,
                        });
                        // 发送题目ID
                        controller.enqueue(
                            new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', questionId: newQuestion.id })}\n\n`)
                        );
                        controller.close();
                    },
                });

                for await (const chunk of result.textStream) {
                    controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`)
                    );
                }
            } catch (error) {
                controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`)
                );
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
});

// 提交答案并获取反馈（流式）
const submitAnswerRoute = createRoute({
    method: "post",
    path: "/{id}/answer",
    tags: ["User - Question"],
    summary: "提交答案并获取 AI 反馈",
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: {
                "application/json": { schema: submitAnswerRequestSchema },
            },
        },
    },
    responses: {
        200: {
            content: { "text/event-stream": { schema: z.any() } },
            description: "流式返回反馈",
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
            description: "题目不存在",
        },
    },
});

questionRoute.use(submitAnswerRoute.getRoutingPath(), authMiddleware);
questionRoute.openapi(submitAnswerRoute, async (c) => {
    const db = getDb(c.env);
    const service = new QuestionService(db);
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    // 检查权限
    const canAccess = await service.canUserAccess(id, user.id);
    if (!canAccess) {
        const question = await service.findById(id);
        if (!question) {
            return c.json({ success: false, message: "题目不存在" }, 404);
        }
        return c.json({ success: false, message: "无权访问此题目" }, 403);
    }

    const question = await service.findById(id);
    if (!question) {
        return c.json({ success: false, message: "题目不存在" }, 404);
    }

    const feedbackLanguage = body.language || 'zh';
    const feedbackModelChoice = body.model || 'gemini';

    const systemPrompt = getQuestionFeedbackPrompt(question.text, feedbackLanguage);
    const models = createAIModels(c.env);
    const model = models.deepseek;
    let fullFeedback = '';

    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const result = await streamText({
                    model,
                    system: systemPrompt,
                    prompt: body.answer,
                    onFinish: async ({ text }) => {
                        fullFeedback = text;
                        const score = parseScoreFromFeedback(fullFeedback);
                        // 更新题目
                        await service.update(id, {
                            answer: body.answer,
                            feedback: fullFeedback,
                            score: score || undefined,
                        });
                        controller.enqueue(
                            new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', score })}\n\n`)
                        );
                        controller.close();
                    },
                });

                for await (const chunk of result.textStream) {
                    controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`)
                    );
                }
            } catch (error) {
                controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`)
                );
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
});

// 删除题目
const deleteQuestionRoute = createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["User - Question"],
    summary: "删除题目",
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            content: { "application/json": { schema: questionResponseSchema } },
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

questionRoute.use(deleteQuestionRoute.getRoutingPath(), authMiddleware);
questionRoute.openapi(deleteQuestionRoute, async (c) => {
    const db = getDb(c.env);
    const service = new QuestionService(db);
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const canAccess = await service.canUserAccess(id, user.id);
    if (!canAccess) {
        const question = await service.findById(id);
        if (!question) {
            return c.json({ success: false, message: "题目不存在" }, 404);
        }
        return c.json({ success: false, message: "无权删除此题目" }, 403);
    }

    const question = await service.delete(id);
    const formattedQuestion = question ? {
        ...question,
        createdAt: question.createdAt.getTime(),
        updatedAt: question.updatedAt.getTime(),
    } : null;
    return c.json({ success: true, question: formattedQuestion, message: "删除成功" }, 200);
});

export default questionRoute;
