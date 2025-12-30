import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { jobInfo } from "./job-info-schema";
import { randomUUID } from "crypto";

export const questionDifficulties = ["easy", "medium", "hard"] as const;
export type QuestionDifficulty = (typeof questionDifficulties)[number];

export const question = sqliteTable(
  "question",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobInfoId: text("job_info_id")
      .notNull()
      .references(() => jobInfo.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    difficulty: text("difficulty", { enum: questionDifficulties }).notNull(),
    answer: text("answer"),
    feedback: text("feedback"),
    score: integer("score"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("question_userId_idx").on(table.userId),
    index("question_jobInfoId_idx").on(table.jobInfoId),
  ]
);

export const questionRelations = relations(question, ({ one }) => ({
  user: one(user, {
    fields: [question.userId],
    references: [user.id],
  }),
  jobInfo: one(jobInfo, {
    fields: [question.jobInfoId],
    references: [jobInfo.id],
  }),
}));
