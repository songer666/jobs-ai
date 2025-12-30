import { Redis } from "@upstash/redis/cloudflare";

const RESUME_CHAT_PREFIX = 'resume_chat:';
const RESUME_GENERATE_LIMIT_PREFIX = 'rate_limit:resume_generate:';
const RESUME_DATA_PREFIX = 'resume_data:';
const CHAT_EXPIRE_SECONDS = 60 * 60 * 24;
const RESUME_DATA_EXPIRE_SECONDS = 60 * 60 * 5;
const FREE_USER_DAILY_GENERATE_LIMIT = 20;

export interface ChatConversation {
    userId: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    currentQuestionIndex: number;
    collectedInfo: Record<string, any>;
    useProfile?: boolean;
}

export const RESUME_CHAT_QUESTIONS = [
    { field: 'name', question: '你好！我是你的简历助手。首先，请告诉我你的姓名？' },
    { field: 'phone', question: '请提供你的联系电话：' },
    { field: 'email', question: '请提供你的邮箱地址：' },
    { field: 'education', question: '请简述你的最高学历（学校、专业、学位）：' },
    { field: 'workYears', question: '你有多少年工作经验？' },
    { field: 'skills', question: '请列出你的主要技能（用逗号分隔）：' },
    { field: 'experience', question: '请简述你最近的一份工作经历（公司、职位、主要职责）：' },
    { field: 'summary', question: '最后，请用2-3句话做一个自我介绍：' },
];

function getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

export class ResumeGeneratorService {
    private redis: Redis;

    constructor(redis: Redis) {
        this.redis = redis;
    }

    async getConversation(conversationId: string): Promise<ChatConversation | null> {
        const data = await this.redis.get(`${RESUME_CHAT_PREFIX}${conversationId}`);
        if (!data) return null;
        return typeof data === 'string' ? JSON.parse(data) : data as ChatConversation;
    }

    async saveConversation(conversationId: string, data: ChatConversation): Promise<void> {
        await this.redis.set(
            `${RESUME_CHAT_PREFIX}${conversationId}`,
            JSON.stringify(data),
            { ex: CHAT_EXPIRE_SECONDS }
        );
    }

    async deleteConversation(conversationId: string): Promise<void> {
        await this.redis.del(`${RESUME_CHAT_PREFIX}${conversationId}`);
    }

    async startConversation(userId: string, useProfile: boolean = false): Promise<{
        conversationId: string;
        isComplete: boolean;
        message?: { role: 'assistant'; content: string };
    }> {
        const conversationId = `${userId}-${Date.now()}`;

        if (useProfile) {
            const profileConversationId = `profile-${conversationId}`;
            const conversation: ChatConversation = {
                userId,
                messages: [],
                currentQuestionIndex: RESUME_CHAT_QUESTIONS.length,
                collectedInfo: {},
                useProfile: true,
            };
            await this.saveConversation(profileConversationId, conversation);
            return {
                conversationId: profileConversationId,
                isComplete: true,
            };
        }

        const firstQuestion = RESUME_CHAT_QUESTIONS[0].question;
        const conversation: ChatConversation = {
            userId,
            messages: [{ role: 'assistant', content: firstQuestion }],
            currentQuestionIndex: 0,
            collectedInfo: {},
        };
        await this.saveConversation(conversationId, conversation);

        return {
            conversationId,
            isComplete: false,
            message: { role: 'assistant', content: firstQuestion },
        };
    }

    async sendMessage(conversationId: string, userId: string, message: string): Promise<{
        success: boolean;
        message?: { role: 'assistant'; content: string };
        isComplete: boolean;
        collectedInfo: Record<string, any>;
        error?: string;
    }> {
        const conversation = await this.getConversation(conversationId);
        if (!conversation || conversation.userId !== userId) {
            return { success: false, isComplete: false, collectedInfo: {}, error: '对话不存在或已过期' };
        }

        conversation.messages.push({ role: 'user', content: message });

        if (conversation.currentQuestionIndex < RESUME_CHAT_QUESTIONS.length) {
            const currentQ = RESUME_CHAT_QUESTIONS[conversation.currentQuestionIndex];
            conversation.collectedInfo[currentQ.field] = message;
            conversation.currentQuestionIndex++;

            let assistantMessage: string;
            if (conversation.currentQuestionIndex >= RESUME_CHAT_QUESTIONS.length) {
                assistantMessage = '太好了！我已经收集了所有需要的信息。现在请选择一个模板来生成你的简历。';
            } else {
                const nextQuestion = RESUME_CHAT_QUESTIONS[conversation.currentQuestionIndex];
                assistantMessage = nextQuestion.question;
            }

            conversation.messages.push({ role: 'assistant', content: assistantMessage });
            await this.saveConversation(conversationId, conversation);

            return {
                success: true,
                message: { role: 'assistant', content: assistantMessage },
                isComplete: conversation.currentQuestionIndex >= RESUME_CHAT_QUESTIONS.length,
                collectedInfo: conversation.collectedInfo,
            };
        }

        return {
            success: true,
            isComplete: true,
            collectedInfo: conversation.collectedInfo,
        };
    }

    async getCollectedInfo(conversationId: string, userId: string): Promise<{
        success: boolean;
        collectedInfo?: Record<string, any>;
        isProfileMode?: boolean;
        error?: string;
    }> {
        const isProfileMode = conversationId.startsWith('profile-');
        
        if (isProfileMode) {
            return {
                success: true,
                collectedInfo: {},
                isProfileMode: true,
            };
        }

        const conversation = await this.getConversation(conversationId);
        if (!conversation || conversation.userId !== userId) {
            return { success: false, error: '对话不存在或已过期' };
        }

        return {
            success: true,
            collectedInfo: conversation.collectedInfo,
            isProfileMode: false,
        };
    }

    async checkGenerateRateLimit(userId: string, userRole: string): Promise<{
        allowed: boolean;
        message?: string;
        remaining?: number;
    }> {
        const limit = userRole === 'admin' ? 100 : 5;
        const key = `rate_limit:resume_generate:${userId}`;
        
        const today = new Date().toDateString();
        const data = await this.redis.get(key) as { date: string; count: number } | null;
        
        if (!data || data.date !== today) {
            return { allowed: true, remaining: limit };
        }
        
        if (data.count >= limit) {
            return { allowed: false, message: `今日简历生成次数已用完（${limit}次/天）` };
        }
        
        return { allowed: true, remaining: limit - data.count };
    }

    async incrementGenerateCount(userId: string): Promise<number> {
        const key = `rate_limit:resume_generate:${userId}`;
        const today = new Date().toDateString();
        const data = await this.redis.get(key) as { date: string; count: number } | null;
        
        const newCount = (!data || data.date !== today) ? 1 : data.count + 1;
        await this.redis.set(key, { date: today, count: newCount }, { ex: 86400 });
        
        return newCount;
    }

    async getUsage(userId: string, userRole: string): Promise<{
        generateUsed: number;
        generateLimit: number;
        generateRemaining: number;
    }> {
        const limit = userRole === 'admin' ? 100 : FREE_USER_DAILY_GENERATE_LIMIT;
        const todayKey = getTodayKey();
        const key = `${RESUME_GENERATE_LIMIT_PREFIX}${userId}:${todayKey}`;
        const count = (await this.redis.get(key) as number) || 0;
        
        return {
            generateUsed: count,
            generateLimit: limit,
            generateRemaining: Math.max(0, limit - count),
        };
    }

    async cacheResumeData(resumeId: string, data: any): Promise<void> {
        const key = `${RESUME_DATA_PREFIX}${resumeId}`;
        await this.redis.set(key, JSON.stringify(data), { ex: RESUME_DATA_EXPIRE_SECONDS });
    }

    async getCachedResumeData(resumeId: string): Promise<any | null> {
        const key = `${RESUME_DATA_PREFIX}${resumeId}`;
        const data = await this.redis.get<string>(key);
        if (!data) return null;
        try {
            return typeof data === 'string' ? JSON.parse(data) : data;
        } catch {
            return null;
        }
    }

    async deleteCachedResumeData(resumeId: string): Promise<void> {
        const key = `${RESUME_DATA_PREFIX}${resumeId}`;
        await this.redis.del(key);
    }
}

export function createResumeGeneratorService(redis: Redis): ResumeGeneratorService {
    return new ResumeGeneratorService(redis);
}

export class ResumeR2Service {
    private bucket: R2Bucket;

    constructor(bucket: R2Bucket) {
        this.bucket = bucket;
    }

    private generatePhotoKey(userId: string, resumeId: string, ext: string): string {
        return `${userId}/resume/${resumeId}/photo-${Date.now()}.${ext}`;
    }

    async uploadPhoto(userId: string, resumeId: string, file: File): Promise<{ r2Key: string }> {
        const ext = file.name.split('.').pop() || 'jpg';
        const r2Key = this.generatePhotoKey(userId, resumeId, ext);

        const arrayBuffer = await file.arrayBuffer();
        await this.bucket.put(r2Key, arrayBuffer, {
            httpMetadata: { contentType: file.type },
        });

        return { r2Key };
    }

    async deleteFile(r2Key: string): Promise<void> {
        try {
            await this.bucket.delete(r2Key);
        } catch (e) {
            console.error('删除 R2 文件失败:', e);
        }
    }

    async getFile(r2Key: string): Promise<R2ObjectBody | null> {
        return this.bucket.get(r2Key);
    }

    async fileExists(r2Key: string): Promise<boolean> {
        const obj = await this.bucket.head(r2Key);
        return obj !== null;
    }

    async deleteResumeFiles(userId: string, resumeId: string): Promise<void> {
        const prefix = `${userId}/resume/${resumeId}/`;
        const listed = await this.bucket.list({ prefix });
        
        for (const object of listed.objects) {
            await this.bucket.delete(object.key);
        }
    }
}

export function createResumeR2Service(bucket: R2Bucket): ResumeR2Service {
    return new ResumeR2Service(bucket);
}
