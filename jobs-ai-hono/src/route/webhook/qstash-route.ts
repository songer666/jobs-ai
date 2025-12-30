import { Hono } from "hono";
import { getDb } from "../../db";
import { InterviewService } from "../../service/interview-service";
import { generateInterviewFeedback } from "../../lib/ai";
import type { EvaluateInterviewPayload, AutoEndInterviewPayload } from "../../lib/queue";
import { publishEvaluateInterview } from "../../lib/queue";

export const qstashRoute = new Hono<{ Bindings: CloudflareBindings }>();

// QStash 回调端点 - 处理面试评分
qstashRoute.post("/evaluate-interview", async (c) => {
    // 验证 QStash 签名（生产环境应该验证）
    const signature = c.req.header("Upstash-Signature");
    if (!signature && c.env.QSTASH_CURRENT_SIGNING_KEY) {
        // 可以添加签名验证逻辑
        console.warn("Missing QStash signature");
    }

    try {
        const payload = await c.req.json<EvaluateInterviewPayload>();
        const { interviewId, jobInfo, conversationHistory, userName, language, model } = payload;

        console.log("Processing interview evaluation:", interviewId);

        const db = getDb(c.env);
        const service = new InterviewService(db);

        // 生成评分
        const feedback = await generateInterviewFeedback(
            c.env,
            {
                title: jobInfo.title,
                description: jobInfo.description,
                experienceLevel: jobInfo.experienceLevel,
            },
            conversationHistory,
            userName,
            language as 'zh' | 'en',
            model
        );

        // 从反馈中提取分数
        const scoreMatch = feedback.match(/(\d+)\/10/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) * 10 : null;

        // 更新面试记录为已完成
        await service.update(interviewId, {
            status: "completed",
            feedback,
            score: score ?? undefined,
        });

        console.log("Interview evaluation completed:", interviewId, "score:", score);

        return c.json({ success: true, interviewId, score });
    } catch (error) {
        console.error("Interview evaluation failed:", error);
        
        // 尝试将状态更新为已完成（带错误信息）
        try {
            const payload = await c.req.json<EvaluateInterviewPayload>();
            const db = getDb(c.env);
            const service = new InterviewService(db);
            await service.update(payload.interviewId, {
                status: "completed",
                feedback: "评分生成失败，请联系管理员。错误信息：" + (error instanceof Error ? error.message : String(error)),
            });
        } catch (updateError) {
            console.error("Failed to update interview status:", updateError);
        }

        return c.json({ 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
        }, 500);
    }
});

/**
 * QStash 回调端点 - 处理面试自动结束（1小时超时）
 * 
 * @route POST /api/webhook/qstash/auto-end-interview
 * 
 * @description
 * 当面试开始1小时后，QStash 会自动调用此 Webhook 来结束面试。
 * 
 * 处理流程：
 * 1. 检查面试状态（只处理 in_progress 状态）
 * 2. 如果用户已提前结束面试（completed/evaluating），直接返回成功
 * 3. 获取聊天记录
 * 4. 更新状态为 "evaluating"
 * 5. 发送评分任务到 QStash
 * 
 * 注意事项：
 * - 用户可能在1小时内手动结束面试，此时状态已不是 in_progress
 * - 通过状态检查避免重复结束和重复评分
 * - 即使用户关闭页面，此 Webhook 也会在1小时后自动触发
 */
qstashRoute.post("/auto-end-interview", async (c) => {
    // 验证 QStash 签名（生产环境应该验证）
    const signature = c.req.header("Upstash-Signature");
    if (!signature && c.env.QSTASH_CURRENT_SIGNING_KEY) {
        console.warn("Missing QStash signature");
    }

    try {
        const payload = await c.req.json<AutoEndInterviewPayload>();
        const { interviewId } = payload;

        console.log("Processing auto-end interview:", interviewId);

        const db = getDb(c.env);
        const service = new InterviewService(db);
        const { ChatMessageService } = await import("../../service/user/chat-message-service");
        const chatService = new ChatMessageService(db);

        // 获取面试信息
        const interview = await service.findByIdWithJobInfo(interviewId);
        if (!interview) {
            console.log("Interview not found:", interviewId);
            return c.json({ success: false, message: "面试不存在" }, 404);
        }

        /**
         * 关键检查：只有进行中的面试才自动结束
         * 
         * 如果用户在1小时内手动结束了面试，状态会是：
         * - "evaluating": 正在评分中
         * - "completed": 已完成
         * 
         * 这种情况下，直接返回成功，不做任何处理，避免：
         * - 重复结束面试
         * - 重复发送评分任务
         * - 覆盖已有的评分结果
         */
        if (interview.status !== "in_progress") {
            console.log("Interview already ended:", interviewId, "status:", interview.status);
            return c.json({ success: true, message: "面试已结束" });
        }

        // 获取聊天记录
        const messages = await chatService.getMessages(interviewId);
        const conversationHistory = messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));

        // 更新状态为评分中
        await service.update(interviewId, {
            status: "evaluating",
            duration: 3600, // 1小时（秒）
        });

        // 获取用户信息（从面试记录中）
        const userName = "候选人"; // TODO: 可以从 user 表获取真实姓名

        // 发送评分任务到 QStash
        const baseUrl = c.env.API_BASE_URL || 'http://localhost:8787';
        const callbackUrl = `${baseUrl}/api/webhook/qstash/evaluate-interview`;

        await publishEvaluateInterview(
            c.env.QSTASH_TOKEN,
            callbackUrl,
            {
                interviewId,
                jobInfo: {
                    title: interview.jobInfo?.title || "",
                    description: interview.jobInfo?.description || "",
                    experienceLevel: interview.jobInfo?.experienceLevel || "junior",
                },
                conversationHistory,
                userName,
                language: interview.language || 'zh',
                model: (interview.model as 'gemini' | 'deepseek') || 'gemini',
            }
        );

        console.log("Auto-end interview completed:", interviewId);

        return c.json({ success: true, interviewId });
    } catch (error) {
        console.error("Auto-end interview failed:", error);
        return c.json({ 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
        }, 500);
    }
});
