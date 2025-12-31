import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { jobInfo } from "./job-info-schema";
import { randomUUID } from "crypto";

// 简历生成表 - AI 生成的简历
export const resume = sqliteTable(
  "resume",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobInfoId: text("job_info_id")
      .references(() => jobInfo.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    // 简历内容 (Markdown 格式)
    content: text("content"),
    // 样式描述 (用户输入的样式 prompt)
    stylePrompt: text("style_prompt"),
    // 状态
    status: text("status", { enum: ["draft", "generated", "optimized"] }).default("draft"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resume_userId_idx").on(table.userId),
    index("resume_jobInfoId_idx").on(table.jobInfoId),
  ]
);

export const resumeRelations = relations(resume, ({ one }) => ({
  user: one(user, {
    fields: [resume.userId],
    references: [user.id],
  }),
  jobInfo: one(jobInfo, {
    fields: [resume.jobInfoId],
    references: [jobInfo.id],
  }),
}));
