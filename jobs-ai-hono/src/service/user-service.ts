import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { user, session } from "../db/schema";
import type { UpdateProfileRequest, SessionWithUser } from "../type/user-type";

export class UserService {
  private db: ReturnType<typeof getDb>;

  constructor(env: CloudflareBindings) {
    this.db = getDb(env);
  }

  async updateEmailVerified(userId: string, verified: boolean) {
    await this.db.update(user)
      .set({ emailVerified: verified })
      .where(eq(user.id, userId));
    return { success: true, message: verified ? '已设为已验证' : '已设为未验证' };
  }

  async getUserSessions(userId: string) {
    const sessions = await this.db.select().from(session).where(eq(session.userId, userId));
    return sessions;
  }

  async getAllSessions(): Promise<SessionWithUser[]> {
    const sessions = await this.db
      .select({
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        userName: user.name,
        userEmail: user.email,
      })
      .from(session)
      .leftJoin(user, eq(session.userId, user.id));
    return sessions as SessionWithUser[];
  }

  async deleteSession(sessionId: string) {
    await this.db.delete(session).where(eq(session.id, sessionId));
    return { success: true, message: '会话已删除' };
  }

  async deleteUserSessions(userId: string) {
    await this.db.delete(session).where(eq(session.userId, userId));
    return { success: true, message: '用户所有会话已删除' };
  }

  async getUserById(userId: string) {
    const userData = await this.db.select().from(user).where(eq(user.id, userId));
    if (userData.length === 0) {
      return null;
    }
    return userData[0];
  }

  async updateProfile(userId: string, data: UpdateProfileRequest) {
    const updateData: Record<string, unknown> = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.username !== undefined) {
      updateData.username = data.username;
      updateData.displayUsername = data.username;
    }
    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, message: '没有要更新的字段', user: null };
    }

    await this.db.update(user)
      .set(updateData)
      .where(eq(user.id, userId));

    const updatedUser = await this.getUserById(userId);
    return { success: true, message: '更新成功', user: updatedUser };
  }
}

export const createUserService = (env: CloudflareBindings) => new UserService(env);
