import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, asc } from 'drizzle-orm';
import { chatMessage } from '../db/schema/chat-message-schema';

export interface ChatMessageData {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
}

export class ChatMessageService {
    constructor(private db: DrizzleD1Database<any>) {}

    async getMessages(interviewId: string): Promise<ChatMessageData[]> {
        try {
            const messages = await this.db
                .select()
                .from(chatMessage)
                .where(eq(chatMessage.interviewId, interviewId))
                .orderBy(asc(chatMessage.createdAt));

            return messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt.getTime(),
            }));
        } catch {
            return [];
        }
    }

    async addMessage(interviewId: string, role: 'user' | 'assistant', content: string): Promise<ChatMessageData> {
        const messageId = crypto.randomUUID();
        const now = Date.now();

        const newMessage: ChatMessageData = {
            id: messageId,
            role,
            content,
            createdAt: now,
        };

        try {
            await this.db.insert(chatMessage).values({
                id: messageId,
                interviewId,
                role,
                content,
                createdAt: new Date(now),
            });
        } catch (error) {
            console.error('Failed to save chat message:', error);
        }

        return newMessage;
    }

    async clearMessages(interviewId: string): Promise<void> {
        try {
            await this.db
                .delete(chatMessage)
                .where(eq(chatMessage.interviewId, interviewId));
        } catch {
            // 忽略错误
        }
    }
}
