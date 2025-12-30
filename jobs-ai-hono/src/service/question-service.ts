import { eq, desc, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { question } from "../db/schema/question-schema";
import { jobInfo } from "../db/schema/job-info-schema";
import type { QuestionDifficulty } from "../lib/prompt/question-prompt";

export interface CreateQuestionData {
    userId: string;
    jobInfoId: string;
    text: string;
    difficulty: QuestionDifficulty;
}

export interface UpdateQuestionData {
    answer?: string;
    feedback?: string;
    score?: number;
}

export class QuestionService {
    constructor(private db: DrizzleD1Database<any>) {}

    async findByUserId(userId: string) {
        return this.db
            .select({
                id: question.id,
                userId: question.userId,
                jobInfoId: question.jobInfoId,
                text: question.text,
                difficulty: question.difficulty,
                answer: question.answer,
                feedback: question.feedback,
                score: question.score,
                createdAt: question.createdAt,
                updatedAt: question.updatedAt,
                jobInfo: {
                    id: jobInfo.id,
                    name: jobInfo.name,
                    title: jobInfo.title,
                },
            })
            .from(question)
            .leftJoin(jobInfo, eq(question.jobInfoId, jobInfo.id))
            .where(eq(question.userId, userId))
            .orderBy(desc(question.createdAt));
    }

    async findByJobInfoId(userId: string, jobInfoId: string) {
        return this.db
            .select({
                id: question.id,
                userId: question.userId,
                jobInfoId: question.jobInfoId,
                text: question.text,
                difficulty: question.difficulty,
                answer: question.answer,
                feedback: question.feedback,
                score: question.score,
                createdAt: question.createdAt,
                updatedAt: question.updatedAt,
            })
            .from(question)
            .where(
                and(
                    eq(question.userId, userId),
                    eq(question.jobInfoId, jobInfoId)
                )
            )
            .orderBy(desc(question.createdAt));
    }

    async findById(id: string) {
        const result = await this.db
            .select()
            .from(question)
            .where(eq(question.id, id))
            .limit(1);
        return result[0] || null;
    }

    async findByIdWithJobInfo(id: string) {
        const result = await this.db
            .select({
                id: question.id,
                userId: question.userId,
                jobInfoId: question.jobInfoId,
                text: question.text,
                difficulty: question.difficulty,
                answer: question.answer,
                feedback: question.feedback,
                score: question.score,
                createdAt: question.createdAt,
                updatedAt: question.updatedAt,
                jobInfo: {
                    id: jobInfo.id,
                    name: jobInfo.name,
                    title: jobInfo.title,
                    description: jobInfo.description,
                    experienceLevel: jobInfo.experienceLevel,
                },
            })
            .from(question)
            .leftJoin(jobInfo, eq(question.jobInfoId, jobInfo.id))
            .where(eq(question.id, id))
            .limit(1);
        return result[0] || null;
    }

    async create(data: CreateQuestionData) {
        const result = await this.db
            .insert(question)
            .values({
                userId: data.userId,
                jobInfoId: data.jobInfoId,
                text: data.text,
                difficulty: data.difficulty,
            })
            .returning();
        return result[0];
    }

    async update(id: string, data: UpdateQuestionData) {
        const result = await this.db
            .update(question)
            .set(data)
            .where(eq(question.id, id))
            .returning();
        return result[0] || null;
    }

    async delete(id: string) {
        const result = await this.db
            .delete(question)
            .where(eq(question.id, id))
            .returning();
        return result[0] || null;
    }

    async canUserAccess(questionId: string, userId: string): Promise<boolean> {
        const result = await this.findById(questionId);
        if (!result) return false;
        return result.userId === userId;
    }

    async countTodayByUser(userId: string): Promise<number> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const result = await this.db
            .select()
            .from(question)
            .where(eq(question.userId, userId));
        
        const todayQuestions = result.filter(q => {
            const createdAt = new Date(q.createdAt);
            return createdAt >= today;
        });
        
        return todayQuestions.length;
    }

    async getPreviousQuestions(userId: string, jobInfoId: string, limit: number = 10) {
        const result = await this.db
            .select({
                text: question.text,
                difficulty: question.difficulty,
            })
            .from(question)
            .where(
                and(
                    eq(question.userId, userId),
                    eq(question.jobInfoId, jobInfoId)
                )
            )
            .orderBy(desc(question.createdAt))
            .limit(limit);
        return result;
    }
}
