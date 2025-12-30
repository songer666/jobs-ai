import { z } from "@hono/zod-openapi";

/** 个人信息 Schema */
export const profileSchema = z.object({
  id: z.string().openapi({ example: "profile_abc123" }),
  userId: z.string().openapi({ example: "user_abc123" }),
  // 基本信息
  realName: z.string().nullable().openapi({ example: "张三" }),
  phone: z.string().nullable().openapi({ example: "13800138000" }),
  location: z.string().nullable().openapi({ example: "北京" }),
  avatarUrl: z.string().nullable().openapi({ example: "https://example.com/avatar.jpg" }),
  summary: z.string().nullable().openapi({ example: "5年前端开发经验" }),
  // 求职意向
  jobTarget: z.string().nullable().openapi({ example: "前端开发工程师" }),
  expectedSalary: z.string().nullable().openapi({ example: "15-20K" }),
  workYears: z.number().nullable().openapi({ example: 3 }),
  // 教育与经历
  education: z.string().nullable().openapi({ example: "本科" }),
  workExperience: z.string().nullable().openapi({ example: "[]" }),
  projects: z.string().nullable().openapi({ example: "[]" }),
  // 技能
  skills: z.string().nullable().openapi({ example: "React、TypeScript、Node.js" }),
  certificates: z.string().nullable().openapi({ example: "[]" }),
  languages: z.string().nullable().openapi({ example: "[]" }),
  // 自我评价
  selfEvaluation: z.string().nullable().openapi({ example: "热爱技术，善于学习" }),
  // 社交链接
  github: z.string().nullable().openapi({ example: "https://github.com/username" }),
  linkedin: z.string().nullable().openapi({ example: "https://linkedin.com/in/username" }),
  portfolio: z.string().nullable().openapi({ example: "https://myportfolio.com" }),
  createdAt: z.union([z.coerce.date(), z.number()]).openapi({ example: "2024-01-01T00:00:00.000Z" }),
  updatedAt: z.union([z.coerce.date(), z.number()]).openapi({ example: "2024-01-01T00:00:00.000Z" }),
});

/** 创建个人信息请求 Schema */
export const createProfileRequestSchema = z.object({
  realName: z.string().max(50).optional().openapi({ example: "张三" }),
  phone: z.string().max(20).optional().openapi({ example: "13800138000" }),
  location: z.string().max(100).optional().openapi({ example: "北京" }),
  avatarUrl: z.string().max(500).optional().openapi({ example: "https://example.com/avatar.jpg" }),
  summary: z.string().max(1000).optional().openapi({ example: "5年前端开发经验" }),
  jobTarget: z.string().max(200).optional().openapi({ example: "前端开发工程师" }),
  expectedSalary: z.string().max(50).optional().openapi({ example: "15-20K" }),
  workYears: z.number().min(0).max(50).optional().openapi({ example: 3 }),
  education: z.string().max(50).optional().openapi({ example: "本科" }),
  workExperience: z.string().optional().openapi({ example: "[]" }),
  projects: z.string().optional().openapi({ example: "[]" }),
  skills: z.string().max(1000).optional().openapi({ example: "React、TypeScript、Node.js" }),
  certificates: z.string().optional().openapi({ example: "[]" }),
  languages: z.string().optional().openapi({ example: "[]" }),
  selfEvaluation: z.string().max(2000).optional().openapi({ example: "热爱技术，善于学习" }),
  github: z.string().max(200).optional().openapi({ example: "https://github.com/username" }),
  linkedin: z.string().max(200).optional().openapi({ example: "https://linkedin.com/in/username" }),
  portfolio: z.string().max(200).optional().openapi({ example: "https://myportfolio.com" }),
});

/** 更新个人信息请求 Schema */
export const updateProfileRequestSchema = createProfileRequestSchema;

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

/** 获取职业信息响应 Schema */
export const getProfileResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  profile: profileSchema.nullable(),
});

/** 更新职业信息响应 Schema */
export const updateProfileResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: "更新成功" }),
  profile: profileSchema,
});
