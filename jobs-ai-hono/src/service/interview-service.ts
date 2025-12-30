import { eq, desc, and, asc } from "drizzle-orm";
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { interview } from "../db/schema/interview-schema";
import { jobInfo } from "../db/schema/job-info-schema";
import { chatMessage } from "../db/schema/chat-message-schema";
import type { CreateInterviewData, UpdateInterviewData } from "../type/interview-type";

export class InterviewService {
    constructor(private db: DrizzleD1Database<any>) {}

    async findByUserId(userId: string) {
        return this.db
            .select({
                id: interview.id,
                userId: interview.userId,
                jobInfoId: interview.jobInfoId,
                duration: interview.duration,
                chatId: interview.chatId,
                feedback: interview.feedback,
                score: interview.score,
                status: interview.status,
                createdAt: interview.createdAt,
                updatedAt: interview.updatedAt,
                jobInfo: {
                    id: jobInfo.id,
                    name: jobInfo.name,
                    title: jobInfo.title,
                    experienceLevel: jobInfo.experienceLevel,
                },
            })
            .from(interview)
            .leftJoin(jobInfo, eq(interview.jobInfoId, jobInfo.id))
            .where(eq(interview.userId, userId))
            .orderBy(desc(interview.createdAt));
    }

    async findById(id: string) {
        const result = await this.db
            .select()
            .from(interview)
            .where(eq(interview.id, id))
            .limit(1);
        return result[0] || null;
    }

    async findByIdWithJobInfo(id: string) {
        const result = await this.db
            .select({
                id: interview.id,
                userId: interview.userId,
                jobInfoId: interview.jobInfoId,
                duration: interview.duration,
                chatId: interview.chatId,
                feedback: interview.feedback,
                score: interview.score,
                status: interview.status,
                language: interview.language,
                model: interview.model,
                questionCount: interview.questionCount,
                createdAt: interview.createdAt,
                updatedAt: interview.updatedAt,
                jobInfo: {
                    id: jobInfo.id,
                    name: jobInfo.name,
                    title: jobInfo.title,
                    description: jobInfo.description,
                    experienceLevel: jobInfo.experienceLevel,
                },
            })
            .from(interview)
            .leftJoin(jobInfo, eq(interview.jobInfoId, jobInfo.id))
            .where(eq(interview.id, id))
            .limit(1);
        return result[0] || null;
    }

    async create(data: CreateInterviewData) {
        const result = await this.db
            .insert(interview)
            .values({
                userId: data.userId,
                jobInfoId: data.jobInfoId,
                chatId: data.chatId,
                language: data.language || "zh",
                model: data.model || "gemini",
                status: "pending",
            })
            .returning();
        return result[0];
    }

    async update(id: string, data: UpdateInterviewData) {
        const result = await this.db
            .update(interview)
            .set(data)
            .where(eq(interview.id, id))
            .returning();
        return result[0] || null;
    }

    async delete(id: string) {
        const result = await this.db
            .delete(interview)
            .where(eq(interview.id, id))
            .returning();
        return result[0] || null;
    }

    async canUserAccess(interviewId: string, userId: string): Promise<boolean> {
        const result = await this.findById(interviewId);
        if (!result) return false;
        return result.userId === userId;
    }

    async incrementQuestionCount(id: string) {
        const current = await this.findById(id);
        const newCount = (current?.questionCount || 0) + 1;
        return this.db
            .update(interview)
            .set({ questionCount: newCount })
            .where(eq(interview.id, id))
            .returning();
    }

    async countTodayByUser(userId: string): Promise<number> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const result = await this.db
            .select()
            .from(interview)
            .where(
                and(
                    eq(interview.userId, userId),
                )
            );
        
        const todayInterviews = result.filter(i => {
            const createdAt = new Date(i.createdAt);
            return createdAt >= today;
        });
        
        return todayInterviews.length;
    }

    async getChatMessages(interviewId: string) {
        return this.db
            .select()
            .from(chatMessage)
            .where(eq(chatMessage.interviewId, interviewId))
            .orderBy(asc(chatMessage.createdAt));
    }

    async addChatMessage(interviewId: string, role: 'user' | 'assistant', content: string) {
        const result = await this.db
            .insert(chatMessage)
            .values({
                interviewId,
                role,
                content,
            })
            .returning();
        return result[0];
    }

    async clearChatMessages(interviewId: string) {
        return this.db
            .delete(chatMessage)
            .where(eq(chatMessage.interviewId, interviewId));
    }
}
