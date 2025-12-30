import { z } from "zod";

// Contact 状态枚举
export const contactStatusEnum = z.enum(["pending", "replied", "closed"]);

// 创建联系消息请求
export const createContactMessageSchema = z.object({
    name: z.string().min(1, "姓名不能为空").max(100),
    email: z.string().email("邮箱格式不正确"),
    subject: z.string().min(1, "主题不能为空").max(200),
    message: z.string().min(10, "消息内容至少10个字符").max(2000, "消息内容不能超过2000个字符"),
});

// 更新状态请求
export const updateContactStatusSchema = z.object({
    status: contactStatusEnum,
});

// Contact 消息
export const contactMessageSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    subject: z.string(),
    message: z.string(),
    ip: z.string().nullable(),
    userAgent: z.string().nullable(),
    status: contactStatusEnum.nullable(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

// 响应 schema
export const contactMessageResponseSchema = z.object({
    success: z.literal(true),
    data: contactMessageSchema,
});

export const contactMessagesResponseSchema = z.object({
    success: z.literal(true),
    data: z.array(contactMessageSchema),
});

export const createContactSuccessSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
        id: z.string(),
        createdAt: z.number(),
    }),
});
