import type { z } from "zod";
import type {
  profileSchema,
  updateProfileRequestSchema,
  createProfileRequestSchema,
} from "../schema/profile-schema";

/** 用户职业信息类型 */
export type Profile = z.infer<typeof profileSchema>;

/** 更新职业信息请求参数 */
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

/** 创建职业信息请求参数 */
export type CreateProfileRequest = z.infer<typeof createProfileRequestSchema>;

/** 通用响应结果 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
};
