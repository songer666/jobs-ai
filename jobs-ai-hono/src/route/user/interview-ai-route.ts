import { OpenAPIHono } from "@hono/zod-openapi";
import { stream } from "hono/streaming";
import { nextCors } from "../../lib/cors";
import { authMiddleware } from "../../lib/auth-middleware";
import { InterviewService } from "../../service/interview-service";
import { getDb } from "../../db";
import { createRedis } from "../../lib/redis";
import { checkQuestionLimit } from "../../lib/rate-limit";
import { generateInterviewQuestion, generateQuestionFeedback } from "../../lib/ai";
import { publishEvaluateInterview, scheduleAutoEndInterview } from "../../lib/queue";

const INTERVIEW_TIMER_PREFIX = 'interview:timer:';
const INTERVIEW_MAX_DURATION = 1 * 60 * 60; // 1小时（秒）

type Variables = {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
        [key: string]: unknown;
    };
};

const interviewAiRoute = new OpenAPIHono<{ Bindings: CloudflareBindings; Variables: Variables }>();

interviewAiRoute.use("/*", nextCors);

// 生成面试问题 (流式)
interviewAiRoute.post("/generate-question", authMiddleware, async (c) => {
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const user = c.get("user");
    
    const body = await c.req.json();
    const { interviewId, difficulty = "medium" } = body;

    if (!interviewId) {
        return c.json({ success: false, message: "面试ID不能为空" }, 400);
    }

    const canAccess = await service.canUserAccess(interviewId, user.id);
    if (!canAccess) {
        return c.json({ success: false, message: "无权访问此面试" }, 403);
    }

    const interview = await service.findByIdWithJobInfo(interviewId);
    if (!interview || !interview.jobInfo) {
        return c.json({ success: false, message: "面试或职位信息不存在" }, 404);
    }

    // 当前问题编号（从1开始）
    const currentQuestionNumber = (interview.questionCount || 0) + 1;
    
    // 判断是否是最后一个问题（第10题）
    const isLastQuestion = currentQuestionNumber >= 10;
    
    // 检查问题数量限制（如果是最后一题，允许生成结束语）
    if (!isLastQuestion) {
        const questionLimit = checkQuestionLimit(interview.questionCount || 0, user.role as string);
        if (!questionLimit.allowed) {
            return c.json({ 
                success: false, 
                message: questionLimit.message,
                questionLimit: {
                    current: questionLimit.current,
                    limit: questionLimit.limit,
                    remaining: questionLimit.remaining,
                }
            }, 429);
        }
    }

    // 更新状态为进行中（不在这里增加问题计数，等生成成功后再增加）
    await service.update(interviewId, { status: "in_progress" });

    // 获取之前的聊天记录，避免重复问题
    const { ChatMessageService } = await import("../../service/chat-message-service");
    const chatService = new ChatMessageService(db);
    const previousMessages = await chatService.getMessages(interviewId);
    const conversationHistory = previousMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
    }));

    const result = await generateInterviewQuestion(
        c.env,
        {
            title: interview.jobInfo.title,
            description: interview.jobInfo.description || "",
            experienceLevel: interview.jobInfo.experienceLevel,
        },
        conversationHistory,
        difficulty,
        interview.language || 'zh',
        (interview.model as 'gemini' | 'deepseek') || 'gemini',
        currentQuestionNumber,
        isLastQuestion
    );

    // 流式返回，只有在成功生成后才增加问题计数
    let hasContent = false;
    return stream(c, async (stream) => {
        try {
            for await (const chunk of result.textStream) {
                if (chunk) {
                    hasContent = true;
                }
                await stream.write(chunk);
            }
            // 只有在有内容时才增加问题计数
            if (hasContent) {
                await service.incrementQuestionCount(interviewId);
            }
        } catch (error) {
            console.error('生成问题失败:', error);
            // 生成失败不增加计数
        }
    });
});

// 提交答案获取反馈 (流式)
interviewAiRoute.post("/submit-answer", authMiddleware, async (c) => {
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const user = c.get("user");
    
    const body = await c.req.json();
    const { interviewId, question, answer } = body;

    if (!interviewId || !question || !answer) {
        return c.json({ success: false, message: "参数不完整" }, 400);
    }

    const canAccess = await service.canUserAccess(interviewId, user.id);
    if (!canAccess) {
        return c.json({ success: false, message: "无权访问此面试" }, 403);
    }

    const interview = await service.findByIdWithJobInfo(interviewId);
    if (!interview) {
        return c.json({ success: false, message: "面试不存在" }, 404);
    }

    const result = await generateQuestionFeedback(
        c.env, 
        question, 
        answer, 
        interview.language || 'zh',
        (interview.model as 'gemini' | 'deepseek') || 'gemini'
    );

    return stream(c, async (stream) => {
        for await (const chunk of result.textStream) {
            await stream.write(chunk);
        }
    });
});

// 完成面试获取总体反馈
interviewAiRoute.post("/complete", authMiddleware, async (c) => {
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const user = c.get("user");
    
    const body = await c.req.json();
    const { interviewId, conversationHistory, duration } = body;

    if (!interviewId || !conversationHistory) {
        return c.json({ success: false, message: "参数不完整" }, 400);
    }

    const canAccess = await service.canUserAccess(interviewId, user.id);
    if (!canAccess) {
        return c.json({ success: false, message: "无权访问此面试" }, 403);
    }

    const interview = await service.findByIdWithJobInfo(interviewId);
    if (!interview || !interview.jobInfo) {
        return c.json({ success: false, message: "面试或职位信息不存在" }, 404);
    }

    try {
        // 先将状态设为 evaluating，立即返回
        await service.update(interviewId, {
            status: "evaluating",
            duration: duration ?? undefined,
        });

        // 构建回调 URL（开发环境使用 localhost:8787）
        const baseUrl = c.env.API_BASE_URL || 'http://localhost:8787';
        const callbackUrl = `${baseUrl}/api/webhook/qstash/evaluate-interview`;

        // 发送评分任务到 QStash
        await publishEvaluateInterview(
            c.env.QSTASH_TOKEN,
            callbackUrl,
            {
                interviewId,
                jobInfo: {
                    title: interview.jobInfo.title || "",
                    description: interview.jobInfo.description || "",
                    experienceLevel: interview.jobInfo.experienceLevel,
                },
                // @ts-ignore
                conversationHistory: conversationHistory.map(msg => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                })),
                userName: user.name || "候选人",
                language: interview.language || 'zh',
                model: (interview.model as 'gemini' | 'deepseek') || 'gemini',
            }
        );

        console.log('已发送评分任务到 QStash:', interviewId);

        return c.json({ 
            success: true, 
            message: "面试已结束，正在生成评分..." 
        }, 200);
    } catch (error) {
        console.error('发送评分任务失败:', error);
        // 如果发送失败，回滚状态
        await service.update(interviewId, {
            status: "completed",
            feedback: "评分任务发送失败，请联系管理员",
        });
        return c.json({
            success: false,
            message: "结束面试失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 获取聊天消息
interviewAiRoute.get("/:id/messages", authMiddleware, async (c) => {
    const user = c.get("user");
    const interviewId = c.req.param("id");
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const { ChatMessageService } = await import("../../service/chat-message-service");
    const chatService = new ChatMessageService(db);

    const canAccess = await service.canUserAccess(interviewId, user.id);
    if (!canAccess) {
        return c.json({ success: false, message: "无权访问" }, 403);
    }

    const messages = await chatService.getMessages(interviewId);
    return c.json({
        success: true,
        messages: messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.createdAt).toISOString(),
        })),
    }, 200);
});

// 添加聊天消息
interviewAiRoute.post("/:id/messages", authMiddleware, async (c) => {
    const user = c.get("user");
    const interviewId = c.req.param("id");
    const body = await c.req.json();
    const db = getDb(c.env);
    const service = new InterviewService(db);
    const { ChatMessageService } = await import("../../service/chat-message-service");
    const chatService = new ChatMessageService(db);

    const canAccess = await service.canUserAccess(interviewId, user.id);
    if (!canAccess) {
        return c.json({ success: false, message: "无权访问" }, 403);
    }

    const message = await chatService.addMessage(interviewId, body.role, body.content);
    return c.json({
        success: true,
        message: {
            id: message.id,
            role: message.role,
            content: message.content,
        },
    }, 200);
});

// 获取面试计时（基于 Redis 存储的开始时间戳计算）
interviewAiRoute.get("/:id/timer", authMiddleware, async (c) => {
    const user = c.get("user");
    const interviewId = c.req.param("id");
    const db = getDb(c.env);
    const service = new InterviewService(db);

    const canAccess = await service.canUserAccess(interviewId, user.id);
    if (!canAccess) {
        return c.json({ success: false, message: "无权访问" }, 403);
    }

    try {
        const redis = createRedis(c.env);
        const timerKey = `${INTERVIEW_TIMER_PREFIX}${interviewId}`;
        const startTime = await redis.get<number>(timerKey);
        
        if (!startTime || startTime <= 0) {
            // 如果没有开始时间，说明面试还未开始计时
            return c.json({
                success: true,
                elapsedTime: 0,
                maxDuration: INTERVIEW_MAX_DURATION,
                exceeded: false,
            }, 200);
        }
        
        // 计算已用时间
        const now = Date.now();
        const elapsedTime = Math.floor((now - startTime) / 1000);
        
        // 如果计算结果为负数或异常大，说明数据有问题
        if (elapsedTime < 0) {
            return c.json({
                success: true,
                elapsedTime: 0,
                maxDuration: INTERVIEW_MAX_DURATION,
                exceeded: false,
            }, 200);
        }
        
        const exceeded = elapsedTime >= INTERVIEW_MAX_DURATION;
        
        return c.json({
            success: true,
            elapsedTime: Math.min(elapsedTime, INTERVIEW_MAX_DURATION),
            maxDuration: INTERVIEW_MAX_DURATION,
            exceeded,
        }, 200);
    } catch (error) {
        console.error('获取计时失败:', error);
        return c.json({ success: true, elapsedTime: 0, maxDuration: INTERVIEW_MAX_DURATION, exceeded: false }, 200);
    }
});

/**
 * 开始面试计时
 * 
 * @route POST /api/user/interview/:id/timer/start
 * 
 * @description
 * 记录面试开始时间到 Redis，并安排 QStash 延迟消息在1小时后自动结束面试。
 * 
 * 处理流程：
 * 1. 检查是否已有开始时间（避免重复设置）
 * 2. 记录开始时间戳到 Redis（过期时间2小时）
 * 3. 安排 QStash 延迟消息（1小时后触发自动结束）
 * 4. 返回开始时间和已用时间
 * 
 * 关键特性：
 * - 即使用户关闭页面，QStash 也会在1小时后自动触发结束面试
 * - 如果用户在1小时内手动结束，Webhook 会检查状态并跳过处理
 * - Redis 过期时间设为2小时，确保计时数据不会过早丢失
 * - 安排延迟消息失败不影响计时开始（容错处理）
 */
interviewAiRoute.post("/:id/timer/start", authMiddleware, async (c) => {
    const user = c.get("user");
    const interviewId = c.req.param("id");
    const db = getDb(c.env);
    const service = new InterviewService(db);

    const canAccess = await service.canUserAccess(interviewId, user.id);
    if (!canAccess) {
        return c.json({ success: false, message: "无权访问" }, 403);
    }

    try {
        const redis = createRedis(c.env);
        const timerKey = `${INTERVIEW_TIMER_PREFIX}${interviewId}`;
        
        // 检查是否已有开始时间（避免重复设置）
        const existingStart = await redis.get<number>(timerKey);
        if (existingStart) {
            const elapsedTime = Math.floor((Date.now() - existingStart) / 1000);
            return c.json({
                success: true,
                startTime: existingStart,
                elapsedTime: Math.min(elapsedTime, INTERVIEW_MAX_DURATION),
                message: "计时已存在",
            }, 200);
        }
        
        /**
         * 先安排 QStash 延迟消息：1小时后自动结束面试
         * 
         * 关键逻辑：
         * - 必须先成功安排延迟消息，才能继续记录开始时间
         * - 如果 QStash 安排失败，则不记录开始时间，返回错误
         * - 这样确保每个开始的面试都有对应的自动结束任务
         * 
         * 自动结束机制：
         * - 即使用户关闭页面，QStash 也会在1小时后触发 Webhook
         * - Webhook 会检查面试状态，只处理 in_progress 状态的面试
         * - 如果用户提前手动结束，Webhook 会跳过处理（避免重复结束）
         */
        const baseUrl = c.env.API_BASE_URL || 'http://localhost:8787';
        const callbackUrl = `${baseUrl}/api/webhook/qstash/auto-end-interview`;
        
        try {
            await scheduleAutoEndInterview(
                c.env.QSTASH_TOKEN,
                callbackUrl,
                { interviewId },
                INTERVIEW_MAX_DURATION // 3600秒（1小时）
            );
            console.log('已安排1小时后自动结束面试:', interviewId);
        } catch (error) {
            console.error('安排自动结束失败:', error);
            // 安排失败，不继续记录开始时间
            return c.json({ 
                success: false, 
                message: "启动面试失败，请稍后重试",
                error: error instanceof Error ? error.message : String(error)
            }, 500);
        }
        
        // QStash 安排成功后，记录开始时间戳到 Redis
        // 过期时间设为2小时（比面试时长多1小时），确保数据不会过早丢失
        const startTime = Date.now();
        await redis.set(timerKey, startTime, { ex: INTERVIEW_MAX_DURATION * 2 });
        
        /**
         * 增加面试计数
         * 
         * 只有在 QStash 成功安排且开始时间记录成功后才增加计数
         * 这样确保：
         * 1. 只有真正开始的面试才计数
         * 2. QStash 失败不会计数
         * 3. 计数准确反映实际使用情况
         */
        const { incrementInterviewCount } = await import("../../lib/rate-limit");
        await incrementInterviewCount(redis, user.id);
        
        return c.json({
            success: true,
            startTime,
            elapsedTime: 0,
            message: "计时已开始",
        }, 200);
    } catch (error) {
        console.error('开始计时失败:', error);
        return c.json({ success: false, message: "开始计时失败" }, 500);
    }
});

export default interviewAiRoute;
