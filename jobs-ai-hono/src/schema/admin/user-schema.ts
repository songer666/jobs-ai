import { z } from "@hono/zod-openapi";

/** 用户 ID 参数 Schema */
export const userIdParamSchema = z.object({
  userId: z.string().openapi({ example: "user_abc123" }),
});

/** 会话 ID 参数 Schema */
export const sessionIdParamSchema = z.object({
  sessionId: z.string().openapi({ example: "session_xyz789" }),
});

/** 用户信息 Schema */
export const userSchema = z.object({
  id: z.string().openapi({ example: "user_abc123" }),
  name: z.string().openapi({ example: "张三" }),
  email: z.string().email().openapi({ example: "zhangsan@example.com" }),
  emailVerified: z.boolean().openapi({ example: true }),
  username: z.string().nullable().openapi({ example: "zhangsan" }),
  displayUsername: z.string().nullable().openapi({ example: "zhangsan" }),
  image: z.string().nullable().openapi({ example: "https://example.com/avatar.jpg" }),
  role: z.string().nullable().openapi({ example: "admin" }),
  banned: z.boolean().nullable().openapi({ example: false }),
  banReason: z.string().nullable().openapi({ example: null }),
  banExpires: z.union([z.coerce.date(), z.number(), z.null()]).openapi({ example: null }),
  createdAt: z.union([z.coerce.date(), z.number()]).openapi({ example: "2024-01-01T00:00:00.000Z" }),
  updatedAt: z.union([z.coerce.date(), z.number()]).openapi({ example: "2024-01-01T00:00:00.000Z" }),
});

/** 会话信息 Schema */
export const sessionSchema = z.object({
  id: z.string().openapi({ example: "session_xyz789" }),
  userId: z.string().openapi({ example: "user_abc123" }),
  token: z.string().openapi({ example: "token_xxx" }),
  expiresAt: z.coerce.date().openapi({ example: "2025-01-01T00:00:00.000Z" }),
  createdAt: z.coerce.date().openapi({ example: "2024-12-22T00:00:00.000Z" }),
  ipAddress: z.string().nullable().openapi({ example: "192.168.1.1" }),
  userAgent: z.string().nullable().openapi({ example: "Mozilla/5.0..." }),
});

/** 会话信息（包含用户信息）Schema */
export const sessionWithUserSchema = sessionSchema.extend({
  userName: z.string().nullable().openapi({ example: "张三" }),
  userEmail: z.string().nullable().openapi({ example: "zhangsan@example.com" }),
});

/** 修改邮箱验证状态请求 Schema */
export const verifyEmailRequestSchema = z.object({
  userId: z.string().min(1).openapi({ example: "user_abc123" }),
  verified: z.boolean().openapi({ example: true }),
});

/** 更新用户信息请求 Schema */
export const updateProfileRequestSchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({ example: "张三" }),
  username: z.string().min(1).max(50).optional().openapi({ example: "zhangsan" }),
  email: z.string().email().optional().openapi({ example: "zhangsan@example.com" }),
});

/** 通用成功响应 Schema */
export const successResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: "操作成功" }),
});

/** 通用错误响应 Schema */
export const errorResponseSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  message: z.string().openapi({ example: "操作失败" }),
  error: z.string().optional().openapi({ example: "错误详情" }),
});

/** 获取用户信息响应 Schema */
export const getUserResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  user: userSchema,
});

/** 更新用户信息响应 Schema */
export const updateUserResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: "更新成功" }),
  user: userSchema,
});

/** 获取会话列表响应 Schema */
export const getSessionsResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  sessions: z.array(sessionSchema),
});

/** 获取所有会话响应 Schema */
export const getAllSessionsResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  sessions: z.array(sessionWithUserSchema),
});
