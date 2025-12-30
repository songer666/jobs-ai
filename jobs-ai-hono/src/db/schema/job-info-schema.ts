import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { randomUUID } from "crypto";

export const experienceLevels = ["junior", "mid-level", "senior"] as const;
export type ExperienceLevel = (typeof experienceLevels)[number];

export const jobInfo = sqliteTable(
  "job_info",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" }),
    isPublic: integer("is_public", { mode: "boolean" }).default(false),
    name: text("name").notNull(),
    title: text("title"),
    description: text("description").notNull(),
    experienceLevel: text("experience_level", { enum: experienceLevels }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("job_info_userId_idx").on(table.userId)]
);

export const jobInfoRelations = relations(jobInfo, ({ one }) => ({
  user: one(user, {
    fields: [jobInfo.userId],
    references: [user.id],
  }),
}));
