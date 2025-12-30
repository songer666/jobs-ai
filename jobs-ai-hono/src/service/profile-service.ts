import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { userProfile } from "../db/schema";
import type { UpdateProfileRequest } from "../type/profile-type";

export class ProfileService {
  private db: ReturnType<typeof getDb>;

  constructor(env: CloudflareBindings) {
    this.db = getDb(env);
  }

  async getProfileByUserId(userId: string) {
    const profiles = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId));
    return profiles[0] || null;
  }

  async upsertProfile(userId: string, data: UpdateProfileRequest) {
    const existingProfile = await this.getProfileByUserId(userId);

    const allFields = [
      'realName', 'phone', 'location', 'avatarUrl', 'summary',
      'jobTarget', 'expectedSalary', 'workYears',
      'education', 'workExperience', 'projects',
      'skills', 'certificates', 'languages',
      'selfEvaluation', 'github', 'linkedin', 'portfolio'
    ] as const;

    if (existingProfile) {
      const updateData: Record<string, unknown> = {};
      
      for (const field of allFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { success: true, message: "没有要更新的字段", profile: existingProfile };
      }

      await this.db
        .update(userProfile)
        .set(updateData)
        .where(eq(userProfile.userId, userId));

      const updatedProfile = await this.getProfileByUserId(userId);
      return { success: true, message: "更新成功", profile: updatedProfile };
    } else {
      const newProfile: Record<string, unknown> = { userId };
      
      for (const field of allFields) {
        newProfile[field] = data[field] ?? null;
      }

      await this.db.insert(userProfile).values(newProfile as typeof userProfile.$inferInsert);

      const createdProfile = await this.getProfileByUserId(userId);
      return { success: true, message: "创建成功", profile: createdProfile };
    }
  }

}

export const createProfileService = (env: CloudflareBindings) => new ProfileService(env);
