import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { interview } from './interview-schema'
import { randomUUID } from 'crypto'

export const chatMessage = sqliteTable('chat_message', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  interviewId: text('interview_id').notNull().references(() => interview.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('chat_message_interview_id_idx').on(table.interviewId),
])
