import { z } from "@hono/zod-openapi";

export const interviewStatusEnum = z.enum(["pending", "in_progress", "evaluating", "completed"]);

export const interviewLanguageEnum = z.enum(["zh", "en"]);
export const aiModelEnum = z.enum(["gemini", "deepseek"]);

export const createInterviewRequestSchema = z.object({
    jobInfoId: z.string().min(1, "职位ID不能为空"),
    language: interviewLanguageEnum.optional().default("zh"),
    model: aiModelEnum.optional().default("gemini"),
}).openapi({
    example: {
        jobInfoId: "uuid-job-info-id",
        language: "zh",
        model: "gemini",
    },
});

export const updateInterviewRequestSchema = z.object({
    duration: z.number().optional(),
    feedback: z.string().optional(),
    score: z.number().min(0).max(100).optional(),
    status: interviewStatusEnum.optional(),
}).openapi({
    example: {
        duration: 1800,
        score: 85,
        status: "completed",
    },
});

export const interviewResponseSchema = z.object({
    success: z.boolean(),
    interview: z.object({
        id: z.string(),
        userId: z.string(),
        jobInfoId: z.string(),
        duration: z.number().nullable(),
        chatId: z.string().nullable(),
        feedback: z.string().nullable(),
        score: z.number().nullable(),
        status: interviewStatusEnum.nullable(),
        createdAt: z.number(),
        updatedAt: z.number(),
        jobInfo: z.object({
            id: z.string(),
            name: z.string(),
            title: z.string().nullable(),
            experienceLevel: z.string(),
        }).nullable().optional(),
    }).nullable().optional(),
    message: z.string().optional(),
}).openapi({
    example: {
        success: true,
        interview: {
            id: "uuid",
            userId: "user-id",
            jobInfoId: "job-info-id",
            duration: 1800,
            chatId: "chat-id",
            feedback: "面试反馈内容",
            score: 85,
            status: "completed",
            createdAt: 1703587200000,
            updatedAt: 1703587200000,
        },
    },
});

export const interviewListResponseSchema = z.object({
    success: z.boolean(),
    interviews: z.array(z.object({
        id: z.string(),
        userId: z.string(),
        jobInfoId: z.string(),
        duration: z.number().nullable(),
        chatId: z.string().nullable(),
        feedback: z.string().nullable(),
        score: z.number().nullable(),
        status: interviewStatusEnum.nullable(),
        createdAt: z.number(),
        updatedAt: z.number(),
        jobInfo: z.object({
            id: z.string(),
            name: z.string(),
            title: z.string().nullable(),
            experienceLevel: z.string(),
        }).nullable(),
    })),
}).openapi({
    example: {
        success: true,
        interviews: [],
    },
});

export const rateLimitResponseSchema = z.object({
    success: z.boolean(),
    usage: z.object({
        used: z.number(),
        limit: z.number(),
        remaining: z.number(),
    }),
}).openapi({
    example: {
        success: true,
        usage: {
            used: 1,
            limit: 3,
            remaining: 2,
        },
    },
});

export const generateQuestionRequestSchema = z.object({
    interviewId: z.string().min(1, "面试ID不能为空"),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
}).openapi({
    example: {
        interviewId: "uuid-interview-id",
        difficulty: "medium",
    },
});

export const submitAnswerRequestSchema = z.object({
    interviewId: z.string().min(1, "面试ID不能为空"),
    question: z.string().min(1, "问题不能为空"),
    answer: z.string().min(1, "回答不能为空"),
}).openapi({
    example: {
        interviewId: "uuid-interview-id",
        question: "请解释什么是闭包？",
        answer: "闭包是指...",
    },
});

export const errorResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    error: z.string().optional(),
}).openapi({
    example: {
        success: false,
        message: "请求失败",
    },
});
