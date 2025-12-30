import type { z } from "zod";
import type {
  jobInfoSchema,
  createJobInfoRequestSchema,
  updateJobInfoRequestSchema,
  experienceLevelSchema,
} from "../schema/job-info-schema";

/** 经验等级类型 */
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

/** 职位信息类型 */
export type JobInfo = z.infer<typeof jobInfoSchema>;

/** 创建职位信息请求参数 */
export type CreateJobInfoRequest = z.infer<typeof createJobInfoRequestSchema>;

/** 更新职位信息请求参数 */
export type UpdateJobInfoRequest = z.infer<typeof updateJobInfoRequestSchema>;
