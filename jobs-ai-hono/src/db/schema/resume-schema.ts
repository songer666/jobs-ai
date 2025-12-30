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

// 简历分析表 - 用户上传简历的分析结果
export const resumeAnalysis = sqliteTable(
  "resume_analysis",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobInfoId: text("job_info_id")
      .references(() => jobInfo.id, { onDelete: "set null" }),
    // 文件名
    fileName: text("file_name").notNull(),
    // PDF 文件 R2 存储 key
    pdfR2Key: text("pdf_r2_key").notNull(),
    // 分析结果 (Markdown 格式)
    feedback: text("feedback"),
    // 评分 (0-100)
    score: integer("score"),
    // 目标职位描述 (可选)
    jobDescription: text("job_description"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resume_analysis_userId_idx").on(table.userId),
    index("resume_analysis_jobInfoId_idx").on(table.jobInfoId),
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

export const resumeAnalysisRelations = relations(resumeAnalysis, ({ one }) => ({
  user: one(user, {
    fields: [resumeAnalysis.userId],
    references: [user.id],
  }),
  jobInfo: one(jobInfo, {
    fields: [resumeAnalysis.jobInfoId],
    references: [jobInfo.id],
  }),
}));
