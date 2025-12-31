import { z } from "@hono/zod-openapi";

export const resumeStatuses = ["draft", "generated", "optimized"] as const;

// ==================== 简历生成相关 Schema ====================

// AI 生成简历请求
export const generateResumeRequestSchema = z.object({
    resumeId: z.string().optional(),
    jobInfoId: z.string().optional(),
    conversationId: z.string().min(1, "请提供对话ID"),
    stylePrompt: z.string().optional(),
    model: z.enum(['deepseek', 'gemini']).optional(),
    language: z.enum(['zh', 'en']).optional(),
    useProfile: z.boolean().optional(),
});

// 简历对话消息
export const resumeChatMessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
});

// 简历对话请求
export const resumeChatRequestSchema = z.object({
    message: z.string().min(1, "请输入消息"),
});

// 简历响应
export const resumeResponseSchema = z.object({
    success: z.boolean(),
    resume: z.object({
        id: z.string(),
        userId: z.string(),
        jobInfoId: z.string().nullable(),
        name: z.string(),
        content: z.string().nullable(),
        stylePrompt: z.string().nullable(),
        status: z.enum(resumeStatuses).nullable(),
        createdAt: z.number(),
        updatedAt: z.number(),
    }).nullable().optional(),
    message: z.string().optional(),
});

// 简历列表响应
export const resumeListResponseSchema = z.object({
    success: z.boolean(),
    resumes: z.array(z.object({
        id: z.string(),
        userId: z.string(),
        jobInfoId: z.string().nullable(),
        name: z.string(),
        status: z.enum(resumeStatuses).nullable(),
        stylePrompt: z.string().nullable(),
        createdAt: z.number(),
        updatedAt: z.number(),
    })),
});

// 对话响应
export const resumeChatResponseSchema = z.object({
    success: z.boolean(),
    conversationId: z.string(),
    message: resumeChatMessageSchema.optional(),
    isComplete: z.boolean().optional(),
    collectedInfo: z.any().optional(),
});

// ==================== 通用 Schema ====================

// 使用量响应
export const resumeUsageResponseSchema = z.object({
    success: z.boolean(),
    usage: z.object({
        generateUsed: z.number(),
        generateLimit: z.number(),
        generateRemaining: z.number(),
    }),
});

// 错误响应
export const errorResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

// 默认样式 Prompt
export const DEFAULT_STYLE_PROMPT = `请生成一份专业、美观的 HTML 格式简历，要求：
1. 使用现代化设计风格，配色以深蓝色(#1e3a5f)为主色调，白色为背景
2. 头部区域包含姓名（大号加粗）、职位头衔、联系方式（电话、邮箱、地址等横向排列）
3. 结构清晰，包含：个人简介、工作经历、项目经验、教育背景、技能特长
4. 使用卡片式布局，各模块有适当间距和圆角
5. 工作经历和项目经验使用时间线样式展示
6. 技能使用标签样式展示
7. 整体宽度适合 A4 纸打印，内边距适中`;
