import { eq, or, and, isNull, desc } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { jobInfo } from "../db/schema/job-info-schema";
import type { 
  CreateJobInfoRequest, 
  UpdateJobInfoRequest 
} from "../type/job-info-type";

export type CreateJobInfoInput = CreateJobInfoRequest & {
  userId?: string | null;
};

export type UpdateJobInfoInput = Partial<CreateJobInfoInput>;

export class JobInfoService {
  constructor(private db: DrizzleD1Database<any>) {}

  async create(input: CreateJobInfoInput) {
    const result = await this.db
      .insert(jobInfo)
      .values({
        userId: input.userId,
        isPublic: input.isPublic ?? false,
        name: input.name,
        title: input.title,
        description: input.description,
        experienceLevel: input.experienceLevel,
      })
      .returning();

    return result[0];
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(jobInfo)
      .where(eq(jobInfo.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findByUserId(userId: string) {
    const result = await this.db
      .select()
      .from(jobInfo)
      .where(
        or(
          eq(jobInfo.userId, userId),
          eq(jobInfo.isPublic, true)
        )
      )
      .orderBy(desc(jobInfo.createdAt));

    return result;
  }

  async findByUserIdOnly(userId: string) {
    const result = await this.db
      .select()
      .from(jobInfo)
      .where(eq(jobInfo.userId, userId))
      .orderBy(desc(jobInfo.createdAt));

    return result;
  }

  async findByUserIdWithPublic(userId: string) {
    const result = await this.db
      .select()
      .from(jobInfo)
      .where(
        or(
          eq(jobInfo.userId, userId),
          eq(jobInfo.isPublic, true)
        )
      )
      .orderBy(desc(jobInfo.createdAt));

    return result;
  }

  async findPublic() {
    const result = await this.db
      .select()
      .from(jobInfo)
      .where(eq(jobInfo.isPublic, true))
      .orderBy(desc(jobInfo.createdAt));

    return result;
  }

  async findAll() {
    const result = await this.db
      .select()
      .from(jobInfo)
      .orderBy(desc(jobInfo.createdAt));

    return result;
  }

  async update(id: string, input: UpdateJobInfoInput) {
    const result = await this.db
      .update(jobInfo)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(jobInfo.id, id))
      .returning();

    return result[0] || null;
  }

  async delete(id: string) {
    const result = await this.db
      .delete(jobInfo)
      .where(eq(jobInfo.id, id))
      .returning();

    return result[0] || null;
  }

  async canUserAccess(id: string, userId: string) {
    const item = await this.findById(id);
    if (!item) return false;
    return item.isPublic || item.userId === userId;
  }

  async canUserModify(id: string, userId: string) {
    const item = await this.findById(id);
    if (!item) return false;
    return item.userId === userId;
  }
}
