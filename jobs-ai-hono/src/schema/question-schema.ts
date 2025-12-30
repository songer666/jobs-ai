import { z } from "@hono/zod-openapi";

export const questionDifficulties = ["easy", "medium", "hard"] as const;
export const questionLanguages = ["zh", "en"] as const;
export const aiModels = ["deepseek"] as const;

export const generateQuestionRequestSchema = z.object({
    jobInfoId: z.string().min(1, "请选择职位"),
    difficulty: z.enum(questionDifficulties).default("medium"),
    language: z.enum(questionLanguages).default("zh"),
    model: z.enum(aiModels).default("deepseek"),
});

export const submitAnswerRequestSchema = z.object({
    answer: z.string().min(1, "请输入答案"),
    language: z.enum(questionLanguages).default("zh"),
    model: z.enum(aiModels).default("deepseek"),
});

export const questionResponseSchema = z.object({
    success: z.boolean(),
    question: z.object({
        id: z.string(),
        userId: z.string(),
        jobInfoId: z.string(),
        text: z.string(),
        difficulty: z.enum(questionDifficulties),
        answer: z.string().nullable(),
        feedback: z.string().nullable(),
        score: z.number().nullable(),
        createdAt: z.number(),
        updatedAt: z.number(),
    }).nullable().optional(),
    message: z.string().optional(),
});

export const questionListResponseSchema = z.object({
    success: z.boolean(),
    questions: z.array(z.object({
        id: z.string(),
        userId: z.string(),
        jobInfoId: z.string(),
        text: z.string(),
        difficulty: z.enum(questionDifficulties),
        answer: z.string().nullable(),
        feedback: z.string().nullable(),
        score: z.number().nullable(),
        createdAt: z.number(),
        updatedAt: z.number(),
        jobInfo: z.object({
            id: z.string(),
            name: z.string(),
            title: z.string().nullable(),
        }).nullable().optional(),
    })),
});

export const questionUsageResponseSchema = z.object({
    success: z.boolean(),
    usage: z.object({
        used: z.number(),
        limit: z.number(),
        remaining: z.number(),
    }),
});

export const errorResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});
