import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { streamText } from "ai";
import { createRedis } from "../../lib/redis";
import { createAIModels } from "../../lib/ai";
import { getDb } from "../../db";
import { nextCors } from "../../lib/cors";
import { authMiddleware } from "../../lib/auth-middleware";
import { ResumeService } from "../../service/resume-service";
import { JobInfoService } from "../../service/job-info-service";
import { createProfileService } from "../../service/profile-service";
import { createResumeGeneratorService, createResumeR2Service, RESUME_CHAT_QUESTIONS } from "../../service/resume-generator-service";
import { getResumeGenerationPrompt } from "../../lib/prompt/resume-prompt";
import {
    resumeResponseSchema,
    resumeListResponseSchema,
    generateResumeRequestSchema,
    resumeChatResponseSchema,
    resumeChatRequestSchema,
    errorResponseSchema,
    DEFAULT_STYLE_PROMPT,
} from "../../schema/resume-schema";

type Variables = {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
        [key: string]: unknown;
    };
};

// Redis 限流配置
const RESUME_GENERATE_LIMIT_PREFIX = 'rate_limit:resume_generate:';
const RESUME_CHAT_PREFIX = 'resume_chat:';
const FREE_USER_DAILY_GENERATE_LIMIT = 20;
const CHAT_EXPIRE_SECONDS = 3600;

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

async function checkGenerateRateLimit(redis: any, userId: string, userRole: string = 'user') {
    if (userRole === 'admin' || userRole === 'premium') {
        return { allowed: true, remaining: -1 };
    }
    const todayKey = getTodayKey();
    const key = `${RESUME_GENERATE_LIMIT_PREFIX}${userId}:${todayKey}`;
    const count = (await redis.get(key) as number) || 0;
    if (count >= FREE_USER_DAILY_GENERATE_LIMIT) {
        return {
            allowed: false,
            remaining: 0,
            message: `今日简历生成次数已用完（${FREE_USER_DAILY_GENERATE_LIMIT}次/天），请明天再试`,
        };
    }
    return { allowed: true, remaining: FREE_USER_DAILY_GENERATE_LIMIT - count };
}

async function incrementGenerateCount(redis: any, userId: string) {
    const todayKey = getTodayKey();
    const key = `${RESUME_GENERATE_LIMIT_PREFIX}${userId}:${todayKey}`;
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, getSecondsUntilMidnight());
    }
    return count;
}

async function getChatConversation(redis: any, conversationId: string) {
    const data = await redis.get(`${RESUME_CHAT_PREFIX}${conversationId}`);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
}

async function saveChatConversation(redis: any, conversationId: string, data: any) {
    await redis.set(
        `${RESUME_CHAT_PREFIX}${conversationId}`,
        JSON.stringify(data),
        { ex: CHAT_EXPIRE_SECONDS }
    );
}

async function deleteChatConversation(redis: any, conversationId: string) {
    await redis.del(`${RESUME_CHAT_PREFIX}${conversationId}`);
}

const resumeGeneratorRoute = new OpenAPIHono<{ Bindings: CloudflareBindings; Variables: Variables }>();

resumeGeneratorRoute.use("/*", nextCors);

// ==================== 简历列表 ====================
const getMyResumesRoute = createRoute({
    method: "get",
    path: "/resumes",
    tags: ["Resume Generator"],
    summary: "获取我的简历列表",
    responses: {
        200: { content: { "application/json": { schema: resumeListResponseSchema } }, description: "获取成功" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
    },
});

resumeGeneratorRoute.use(getMyResumesRoute.getRoutingPath(), authMiddleware);
resumeGeneratorRoute.openapi(getMyResumesRoute, async (c) => {
    const db = getDb(c.env);
    const service = new ResumeService(db);
    const user = c.get("user");
    const resumes = await service.findByUserId(user.id);
    const formattedResumes = resumes.map(r => ({
        ...r,
        createdAt: r.createdAt.getTime(),
        updatedAt: r.updatedAt.getTime(),
    }));
    return c.json({ success: true, resumes: formattedResumes }, 200);
});

// ==================== 简历详情 ====================
const getResumeRoute = createRoute({
    method: "get",
    path: "/resumes/{id}",
    tags: ["Resume Generator"],
    summary: "获取简历详情",
    request: { params: z.object({ id: z.string() }) },
    responses: {
        200: { content: { "application/json": { schema: resumeResponseSchema } }, description: "获取成功" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
        403: { content: { "application/json": { schema: errorResponseSchema } }, description: "无权访问" },
        404: { content: { "application/json": { schema: errorResponseSchema } }, description: "未找到" },
    },
});

resumeGeneratorRoute.use(getResumeRoute.getRoutingPath(), authMiddleware);
resumeGeneratorRoute.openapi(getResumeRoute, async (c) => {
    const db = getDb(c.env);
    const service = new ResumeService(db);
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const resume = await service.findById(id);
    if (!resume) return c.json({ success: false, message: "简历不存在" }, 404);
    
    if (resume.userId !== user.id) {
        return c.json({ success: false, message: "无权访问此简历" }, 403);
    }

    const formattedResume = {
        ...resume,
        createdAt: resume.createdAt.getTime(),
        updatedAt: resume.updatedAt.getTime(),
    };
    return c.json({ success: true, resume: formattedResume }, 200);
});

// ==================== 删除简历 ====================
const deleteResumeRoute = createRoute({
    method: "delete",
    path: "/resumes/{id}",
    tags: ["Resume Generator"],
    summary: "删除简历",
    request: { params: z.object({ id: z.string() }) },
    responses: {
        200: { content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } }, description: "删除成功" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
        403: { content: { "application/json": { schema: errorResponseSchema } }, description: "无权访问" },
    },
});

resumeGeneratorRoute.use(deleteResumeRoute.getRoutingPath(), authMiddleware);
resumeGeneratorRoute.openapi(deleteResumeRoute, async (c) => {
    const db = getDb(c.env);
    const service = new ResumeService(db);
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const resume = await service.findById(id);
    if (!resume || resume.userId !== user.id) {
        return c.json({ success: false, message: "无权删除此简历" }, 403);
    }

    await service.delete(id);
    return c.json({ success: true, message: "删除成功" }, 200);
});

// ==================== 开始新对话 ====================
const startChatRequestSchema = z.object({
    useProfile: z.boolean().optional(),
});

const startChatRoute = createRoute({
    method: "post",
    path: "/chat/start",
    tags: ["Resume Generator"],
    summary: "开始简历对话",
    request: {
        body: { content: { "application/json": { schema: startChatRequestSchema } } },
    },
    responses: {
        200: { content: { "application/json": { schema: resumeChatResponseSchema } }, description: "开始成功" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
    },
});

resumeGeneratorRoute.use(startChatRoute.getRoutingPath(), authMiddleware);
resumeGeneratorRoute.openapi(startChatRoute, async (c) => {
    const user = c.get("user");
    const redis = createRedis(c.env);
    const body = c.req.valid("json");
    const profileService = createProfileService(c.env);

    const conversationId = `${user.id}-${Date.now()}`;

    // 如果启用了使用个人信息，检查是否有个人信息
    if (body.useProfile) {
        const profile = await profileService.getProfileByUserId(user.id);
        if (profile && profile.realName) {
            const profileConversationId = `profile-${conversationId}`;
            const conversation = {
                userId: user.id,
                messages: [],
                currentQuestionIndex: RESUME_CHAT_QUESTIONS.length,
                collectedInfo: {},
                useProfile: true,
            };
            await saveChatConversation(redis, profileConversationId, conversation);

            return c.json({
                success: true,
                conversationId: profileConversationId,
                isComplete: true,
            }, 200);
        }
    }

    // 正常对话流程
    const firstQuestion = RESUME_CHAT_QUESTIONS[0].question;
    const conversation = {
        userId: user.id,
        messages: [{ role: 'assistant', content: firstQuestion }],
        currentQuestionIndex: 0,
        collectedInfo: {},
    };

    await saveChatConversation(redis, conversationId, conversation);

    return c.json({
        success: true,
        conversationId,
        message: { role: 'assistant' as const, content: firstQuestion },
        isComplete: false,
    }, 200);
});

// ==================== 发送对话消息 ====================
const sendChatRoute = createRoute({
    method: "post",
    path: "/chat/{conversationId}",
    tags: ["Resume Generator"],
    summary: "发送对话消息",
    request: {
        params: z.object({ conversationId: z.string() }),
        body: { content: { "application/json": { schema: resumeChatRequestSchema } } },
    },
    responses: {
        200: { content: { "application/json": { schema: resumeChatResponseSchema } }, description: "发送成功" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
        404: { content: { "application/json": { schema: errorResponseSchema } }, description: "对话不存在" },
    },
});

resumeGeneratorRoute.use(sendChatRoute.getRoutingPath(), authMiddleware);
resumeGeneratorRoute.openapi(sendChatRoute, async (c) => {
    const user = c.get("user");
    const redis = createRedis(c.env);
    const { conversationId } = c.req.valid("param");
    const { message } = c.req.valid("json");

    const conversation = await getChatConversation(redis, conversationId);
    if (!conversation || conversation.userId !== user.id) {
        return c.json({ success: false, message: "对话不存在或已过期", conversationId: '' }, 404);
    }

    conversation.messages.push({ role: 'user', content: message });

    if (conversation.currentQuestionIndex < RESUME_CHAT_QUESTIONS.length) {
        const currentQ = RESUME_CHAT_QUESTIONS[conversation.currentQuestionIndex];
        conversation.collectedInfo[currentQ.field] = message;
        conversation.currentQuestionIndex++;

        let assistantMessage: string;
        if (conversation.currentQuestionIndex >= RESUME_CHAT_QUESTIONS.length) {
            assistantMessage = '太好了！我已经收集了所有需要的信息。现在可以生成你的简历了。';
        } else {
            const nextQuestion = RESUME_CHAT_QUESTIONS[conversation.currentQuestionIndex];
            assistantMessage = nextQuestion.question;
        }

        conversation.messages.push({ role: 'assistant', content: assistantMessage });
        await saveChatConversation(redis, conversationId, conversation);

        return c.json({
            success: true,
            conversationId,
            message: { role: 'assistant' as const, content: assistantMessage },
            isComplete: conversation.currentQuestionIndex >= RESUME_CHAT_QUESTIONS.length,
            collectedInfo: conversation.collectedInfo,
        }, 200);
    }

    return c.json({
        success: true,
        conversationId,
        isComplete: true,
        collectedInfo: conversation.collectedInfo,
    }, 200);
});

// ==================== AI 生成简历（流式） ====================
const generateResumeRoute = createRoute({
    method: "post",
    path: "/generate",
    tags: ["Resume Generator"],
    summary: "AI 生成简历",
    request: { body: { content: { "application/json": { schema: generateResumeRequestSchema } } } },
    responses: {
        200: { content: { "text/event-stream": { schema: z.any() } }, description: "流式返回简历" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
        429: { content: { "application/json": { schema: errorResponseSchema } }, description: "今日次数已用完" },
    },
});

resumeGeneratorRoute.use(generateResumeRoute.getRoutingPath(), authMiddleware);
resumeGeneratorRoute.openapi(generateResumeRoute, async (c) => {
    const db = getDb(c.env);
    const resumeService = new ResumeService(db);
    const jobInfoService = new JobInfoService(db);
    const profileService = createProfileService(c.env);
    const user = c.get("user");
    const body = c.req.valid("json");
    const redis = createRedis(c.env);

    // 检查限流
    const rateLimit = await checkGenerateRateLimit(redis, user.id, user.role as string);
    if (!rateLimit.allowed) {
        return c.json({ success: false, message: rateLimit.message }, 429);
    }

    // 判断是否使用个人信息直接生成（profile 模式、重新生成模式、或 useProfile 为 true）
    const isProfileMode = body.conversationId.startsWith('profile-') && body.useProfile;
    const isRegenerateMode = body.conversationId.startsWith('regenerate-') && body.useProfile;
    const shouldUseProfile = isProfileMode || isRegenerateMode || (body.resumeId && body.useProfile);
    
    let collectedInfo: Record<string, any> = {};
    
    if (shouldUseProfile) {
        // 使用个人信息直接生成（新建或重新生成）
        const profile = await profileService.getProfileByUserId(user.id);
        if (!profile) {
            return c.json({ success: false, message: "未找到个人信息，请先在设置中填写" }, 404);
        }
        collectedInfo = {
            name: profile.realName || '',
            phone: profile.phone || '',
            location: profile.location || '',
            education: profile.education || '',
            workYears: profile.workYears || '',
            skills: profile.skills || '',
            summary: profile.summary || profile.selfEvaluation || '',
            jobTarget: profile.jobTarget || '',
            expectedSalary: profile.expectedSalary || '',
            workExperience: profile.workExperience || '',
            projects: profile.projects || '',
            certificates: profile.certificates || '',
            languages: profile.languages || '',
            github: profile.github || '',
            linkedin: profile.linkedin || '',
            portfolio: profile.portfolio || '',
        };
    } else {
        // 使用对话收集的信息
        const conversation = await getChatConversation(redis, body.conversationId);
        if (!conversation || conversation.userId !== user.id) {
            return c.json({ success: false, message: "对话不存在或已过期" }, 404);
        }
        collectedInfo = { ...conversation.collectedInfo };
        
        if (body.useProfile) {
            const profile = await profileService.getProfileByUserId(user.id);
            if (profile) {
                if (profile.realName && !collectedInfo.name) collectedInfo.name = profile.realName;
                if (profile.phone && !collectedInfo.phone) collectedInfo.phone = profile.phone;
                if (profile.education && !collectedInfo.education) collectedInfo.education = profile.education;
                if (profile.skills && !collectedInfo.skills) collectedInfo.skills = profile.skills;
                if (profile.workYears && !collectedInfo.workYears) collectedInfo.workYears = profile.workYears;
                if (profile.summary && !collectedInfo.summary) collectedInfo.summary = profile.summary;
            }
        }
    }

    // 获取职位信息（可选）
    let jobDescription: string | undefined;
    if (body.jobInfoId) {
        const jobInfo = await jobInfoService.findById(body.jobInfoId);
        if (jobInfo) {
            jobDescription = jobInfo.description;
        }
    }

    // 使用样式 prompt
    const stylePrompt = body.stylePrompt || DEFAULT_STYLE_PROMPT;

    // 如果是首次生成（没有 resumeId），先创建简历记录并返回 resumeId
    // 前端收到后跳转到详情页，然后再次调用此接口进行流式生成
    if (!body.resumeId && shouldUseProfile) {
        const newResume = await resumeService.create({
            userId: user.id,
            name: `AI生成简历-${new Date().toLocaleDateString()}`,
            jobInfoId: body.jobInfoId,
            stylePrompt: stylePrompt,
        });
        
        return c.json({
            success: true,
            resumeId: newResume.id,
            message: '简历记录已创建，请开始生成',
        }, 200);
    }

    // 流式生成
    const systemPrompt = getResumeGenerationPrompt(
        collectedInfo,
        stylePrompt,
        jobDescription
    );

    const models = createAIModels(c.env);
    const modelName = body.model || 'deepseek';
    const model = modelName === 'gemini' ? models.gemini : models.deepseek;
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
                    prompt: body.language === 'en' 
                        ? 'Please generate the resume content based on the above information, return in HTML format with inline CSS styles.'
                        : '请根据以上信息生成简历内容，以 HTML 格式返回，包含内联 CSS 样式。',
                    onFinish: async ({ text }) => {
                        fullText = text;

                        // 创建或更新简历记录
                        let resumeId = body.resumeId;
                        if (resumeId) {
                            // 重新生成：更新现有简历
                            await resumeService.update(resumeId, {
                                content: fullText,
                                stylePrompt: stylePrompt,
                                status: 'generated',
                            });
                        } else {
                            // 新建简历
                            const newResume = await resumeService.create({
                                userId: user.id,
                                name: `AI生成简历-${new Date().toLocaleDateString()}`,
                                jobInfoId: body.jobInfoId,
                                content: fullText,
                                stylePrompt: stylePrompt,
                            });
                            resumeId = newResume.id;
                            await resumeService.update(resumeId, { status: 'generated' });
                        }
                        
                        // 生成成功后扣除积分
                        await incrementGenerateCount(redis, user.id);

                        // 删除对话缓存
                        await deleteChatConversation(redis, body.conversationId);

                        controller.enqueue(
                            new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', resumeId })}\n\n`)
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

// ==================== 获取简历文件（代理 R2） ====================
const getFileRoute = createRoute({
    method: "get",
    path: "/files/{key}",
    tags: ["Resume Generator"],
    summary: "获取简历相关文件",
    request: {
        params: z.object({ key: z.string() }),
    },
    responses: {
        200: { description: "文件内容" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
        403: { content: { "application/json": { schema: errorResponseSchema } }, description: "无权访问" },
        404: { content: { "application/json": { schema: errorResponseSchema } }, description: "文件不存在" },
    },
});

resumeGeneratorRoute.use(getFileRoute.getRoutingPath(), authMiddleware);
resumeGeneratorRoute.openapi(getFileRoute, async (c) => {
    const r2Service = createResumeR2Service(c.env["jobs-ai"]);
    const user = c.get("user");
    const { key } = c.req.valid("param");

    const decodedKey = decodeURIComponent(key);

    if (!decodedKey.startsWith(`${user.id}/`)) {
        return c.json({ success: false, message: "无权访问此文件" }, 403);
    }

    const file = await r2Service.getFile(decodedKey);
    if (!file) {
        return c.json({ success: false, message: "文件不存在" }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', file.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(file.body, { headers });
});

// ==================== 获取使用量 ====================
const getUsageRoute = createRoute({
    method: "get",
    path: "/usage",
    tags: ["Resume Generator"],
    summary: "获取今日生成使用量",
    responses: {
        200: { 
            content: { 
                "application/json": { 
                    schema: z.object({
                        success: z.boolean(),
                        usage: z.object({
                            generateUsed: z.number(),
                            generateLimit: z.number(),
                            generateRemaining: z.number(),
                        }),
                    }) 
                } 
            }, 
            description: "获取成功" 
        },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
    },
});

resumeGeneratorRoute.use(getUsageRoute.getRoutingPath(), authMiddleware);
resumeGeneratorRoute.openapi(getUsageRoute, async (c) => {
    const user = c.get("user");
    const redis = createRedis(c.env);
    const generatorService = createResumeGeneratorService(redis);
    const userRole = user.role as string || 'user';

    const usage = await generatorService.getUsage(user.id, userRole);

    return c.json({ success: true, usage }, 200);
});

// ==================== 获取默认样式 Prompt ====================
const getDefaultStyleRoute = createRoute({
    method: "get",
    path: "/default-style",
    tags: ["Resume Generator"],
    summary: "获取默认样式 Prompt",
    responses: {
        200: { 
            content: { 
                "application/json": { 
                    schema: z.object({
                        success: z.boolean(),
                        stylePrompt: z.string(),
                    }) 
                } 
            }, 
            description: "获取成功" 
        },
    },
});

resumeGeneratorRoute.openapi(getDefaultStyleRoute, async (c) => {
    return c.json({ success: true, stylePrompt: DEFAULT_STYLE_PROMPT }, 200);
});

export default resumeGeneratorRoute;
