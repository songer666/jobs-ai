import { getApiUrl, API_PATHS } from '../lib/config';

export interface VerifyEmailResponse {
    success: boolean;
    message: string;
}

export interface SessionItem {
    id: string;
    userId: string;
    token: string;
    expiresAt: number;
    createdAt: number;
    ipAddress: string;
    userAgent: string;
}

export interface GetSessionsResponse {
    success: boolean;
    sessions: SessionItem[];
}

export interface DeleteSessionResponse {
    success: boolean;
    message: string;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    username: string;
    image?: string;
}

export interface GetProfileResponse {
    success: boolean;
    user: UserProfile;
}

export interface UpdateProfileResponse {
    success: boolean;
    message: string;
    user: UserProfile;
}

export const userApi = {
    /** 修改用户邮箱验证状态 */
    async verifyEmail(userId: string, verified: boolean): Promise<VerifyEmailResponse> {
        const res = await fetch(getApiUrl(API_PATHS.ADMIN_USER.VERIFY_EMAIL), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId, verified }),
        });
        return res.json();
    },

    /** 获取用户的所有会话 */
    async getUserSessions(userId: string): Promise<GetSessionsResponse> {
        const res = await fetch(getApiUrl(API_PATHS.ADMIN_USER.GET_SESSIONS(userId)), {
            credentials: 'include',
        });
        return res.json();
    },

    /** 删除指定会话 */
    async deleteSession(sessionId: string): Promise<DeleteSessionResponse> {
        const res = await fetch(getApiUrl(API_PATHS.ADMIN_USER.DELETE_SESSION(sessionId)), {
            method: 'DELETE',
            credentials: 'include',
        });
        return res.json();
    },

    /** 删除用户的所有会话 */
    async deleteUserSessions(userId: string): Promise<DeleteSessionResponse> {
        const res = await fetch(getApiUrl(API_PATHS.ADMIN_USER.DELETE_USER_SESSIONS(userId)), {
            method: 'DELETE',
            credentials: 'include',
        });
        return res.json();
    },

    /** 获取用户信息 */
    async getProfile(userId: string): Promise<GetProfileResponse> {
        const res = await fetch(getApiUrl(API_PATHS.ADMIN_USER.GET_PROFILE(userId)), {
            credentials: 'include',
        });
        return res.json();
    },

    /** 更新用户信息 */
    async updateProfile(userId: string, data: { name?: string; email?: string; username?: string }): Promise<UpdateProfileResponse> {
        const res = await fetch(getApiUrl(API_PATHS.ADMIN_USER.UPDATE_PROFILE(userId)), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        return res.json();
    },
};
