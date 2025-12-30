import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { jobInfo } from "./job-info-schema";
import { randomUUID } from "crypto";

export const interview = sqliteTable(
  "interview",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobInfoId: text("job_info_id")
      .notNull()
      .references(() => jobInfo.id, { onDelete: "cascade" }),
    duration: integer("duration"),
    chatId: text("chat_id"),
    feedback: text("feedback"),
    score: integer("score"),
    status: text("status", { enum: ["pending", "in_progress", "evaluating", "completed"] }).default("pending"),
    language: text("language", { enum: ["zh", "en"] }).default("zh"),
    model: text("model", { enum: ["gemini", "deepseek"] }).default("gemini"),
    questionCount: integer("question_count").default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("interview_userId_idx").on(table.userId),
    index("interview_jobInfoId_idx").on(table.jobInfoId),
  ]
);

export const interviewRelations = relations(interview, ({ one }) => ({
  user: one(user, {
    fields: [interview.userId],
    references: [user.id],
  }),
  jobInfo: one(jobInfo, {
    fields: [interview.jobInfoId],
    references: [jobInfo.id],
  }),
}));
