import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { randomUUID } from "crypto";

export const userProfile = sqliteTable(
  "user_profile",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    // 基本信息
    realName: text("real_name"),
    phone: text("phone"),
    location: text("location"),
    avatarUrl: text("avatar_url"),
    summary: text("summary"),
    // 求职意向
    jobTarget: text("job_target"),
    expectedSalary: text("expected_salary"),
    workYears: integer("work_years"),
    // 教育背景 (JSON 数组)
    education: text("education"),
    // 工作经历 (JSON 数组)
    workExperience: text("work_experience"),
    // 项目经历 (JSON 数组)
    projects: text("projects"),
    // 技能 (JSON 数组)
    skills: text("skills"),
    // 证书 (JSON 数组)
    certificates: text("certificates"),
    // 语言能力 (JSON 数组)
    languages: text("languages"),
    // 自我评价
    selfEvaluation: text("self_evaluation"),
    // 社交链接
    github: text("github"),
    linkedin: text("linkedin"),
    portfolio: text("portfolio"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("profile_userId_idx").on(table.userId)]
);
