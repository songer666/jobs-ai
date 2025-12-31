import { eq, desc } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { resume } from "../db/schema/resume-schema";

export interface CreateResumeData {
    userId: string;
    name: string;
    jobInfoId?: string;
    content?: string;
    stylePrompt?: string;
}

export interface UpdateResumeData {
    name?: string;
    content?: string;
    stylePrompt?: string;
    status?: "draft" | "generated" | "optimized";
}

export class ResumeService {
    constructor(private db: DrizzleD1Database<any>) {}

    async findByUserId(userId: string) {
        return this.db
            .select({
                id: resume.id,
                userId: resume.userId,
                jobInfoId: resume.jobInfoId,
                name: resume.name,
                status: resume.status,
                stylePrompt: resume.stylePrompt,
                createdAt: resume.createdAt,
                updatedAt: resume.updatedAt,
            })
            .from(resume)
            .where(eq(resume.userId, userId))
            .orderBy(desc(resume.createdAt));
    }

    async findById(id: string) {
        const result = await this.db
            .select()
            .from(resume)
            .where(eq(resume.id, id))
            .limit(1);
        return result[0] || null;
    }

    async create(data: CreateResumeData) {
        const result = await this.db
            .insert(resume)
            .values({
                userId: data.userId,
                name: data.name,
                jobInfoId: data.jobInfoId,
                content: data.content,
                stylePrompt: data.stylePrompt,
            })
            .returning();
        return result[0];
    }

    async update(id: string, data: UpdateResumeData) {
        const result = await this.db
            .update(resume)
            .set(data)
            .where(eq(resume.id, id))
            .returning();
        return result[0] || null;
    }

    async delete(id: string) {
        const result = await this.db
            .delete(resume)
            .where(eq(resume.id, id))
            .returning();
        return result[0] || null;
    }

    async canUserAccess(resumeId: string, userId: string): Promise<boolean> {
        const result = await this.findById(resumeId);
        if (!result) return false;
        return result.userId === userId;
    }

    async canUserModify(resumeId: string, userId: string): Promise<boolean> {
        const result = await this.findById(resumeId);
        if (!result) return false;
        return result.userId === userId;
    }
}
