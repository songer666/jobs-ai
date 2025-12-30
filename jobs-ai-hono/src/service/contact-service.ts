import { eq, and, gte } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { contactMessage, type ContactMessage, type InsertContactMessage } from "../db/schema/contact-schema";

export class ContactService {
    constructor(private db: DrizzleD1Database<any>) {}

    /**
     * 创建联系消息
     */
    async create(data: Omit<InsertContactMessage, "id" | "createdAt" | "updatedAt">) {
        const [message] = await this.db
            .insert(contactMessage)
            .values(data)
            .returning();
        return {
            ...message,
            createdAt: message.createdAt.getTime(),
            updatedAt: message.updatedAt.getTime(),
        };
    }

    /**
     * 检查 IP 限流
     * 同一 IP 在指定时间内只能发送一次消息
     */
    async checkRateLimit(ip: string, durationMs: number): Promise<boolean> {
        const cutoffTime = Date.now() - durationMs;
        
        const recentMessages = await this.db
            .select()
            .from(contactMessage)
            .where(
                and(
                    eq(contactMessage.ip, ip),
                    gte(contactMessage.createdAt, new Date(cutoffTime))
                )
            )
            .limit(1);

        return recentMessages.length === 0;
    }

    /**
     * 获取所有消息（管理员用）
     */
    async findAll(limit = 50, offset = 0) {
        const messages = await this.db
            .select()
            .from(contactMessage)
            .orderBy(contactMessage.createdAt)
            .limit(limit)
            .offset(offset);
        
        return messages.map(msg => ({
            ...msg,
            createdAt: msg.createdAt.getTime(),
            updatedAt: msg.updatedAt.getTime(),
        }));
    }

    /**
     * 根据 ID 获取消息
     */
    async findById(id: string) {
        const [message] = await this.db
            .select()
            .from(contactMessage)
            .where(eq(contactMessage.id, id))
            .limit(1);
        
        if (!message) return message;
        
        return {
            ...message,
            createdAt: message.createdAt.getTime(),
            updatedAt: message.updatedAt.getTime(),
        };
    }

    /**
     * 更新消息状态
     */
    async updateStatus(id: string, status: "pending" | "replied" | "closed") {
        const [updated] = await this.db
            .update(contactMessage)
            .set({ status, updatedAt: new Date() })
            .where(eq(contactMessage.id, id))
            .returning();
        
        if (!updated) return updated;
        
        return {
            ...updated,
            createdAt: updated.createdAt.getTime(),
            updatedAt: updated.updatedAt.getTime(),
        };
    }

    /**
     * 删除消息
     */
    async delete(id: string) {
        const [deleted] = await this.db
            .delete(contactMessage)
            .where(eq(contactMessage.id, id))
            .returning();
        
        if (!deleted) return deleted;
        
        return {
            ...deleted,
            createdAt: deleted.createdAt.getTime(),
            updatedAt: deleted.updatedAt.getTime(),
        };
    }
}
