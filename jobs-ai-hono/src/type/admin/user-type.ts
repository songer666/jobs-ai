import type { z } from "zod";

import type {
  userSchema,
  sessionSchema,
  sessionWithUserSchema,
  verifyEmailRequestSchema,
  updateProfileRequestSchema,
  userIdParamSchema,
  sessionIdParamSchema,
} from "../../schema/admin/user-schema";

/** 用户实体类型 */
export type User = z.infer<typeof userSchema>;

/** 会话实体类型 */
export type Session = z.infer<typeof sessionSchema>;

/** 会话（包含用户信息）类型 */
export type SessionWithUser = z.infer<typeof sessionWithUserSchema>;

/** 修改邮箱验证状态请求参数 */
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;

/** 更新用户信息请求参数 */
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

/** 用户 ID 参数 */
export type UserIdParam = z.infer<typeof userIdParamSchema>;

/** 会话 ID 参数 */
export type SessionIdParam = z.infer<typeof sessionIdParamSchema>;

/** 通用响应结果 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
};
