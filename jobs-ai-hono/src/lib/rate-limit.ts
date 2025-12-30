import type { Redis } from '@upstash/redis';

const INTERVIEW_RATE_LIMIT_PREFIX = 'rate_limit:interview:';
const FREE_USER_DAILY_LIMIT = 10;
const FREE_USER_QUESTION_LIMIT = 10;

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    message: string;
}

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

export async function checkInterviewRateLimit(
    redis: Redis,
    userId: string,
    userRole: string = 'user'
): Promise<RateLimitResult> {
    // 管理员或付费用户不受限制
    if (userRole === 'admin' || userRole === 'premium') {
        return {
            allowed: true,
            remaining: -1,
            resetAt: 0,
            message: '无限制',
        };
    }

    const todayKey = getTodayKey();
    const key = `${INTERVIEW_RATE_LIMIT_PREFIX}${userId}:${todayKey}`;
    
    const count = await redis.get<number>(key) || 0;
    const remaining = FREE_USER_DAILY_LIMIT - count;
    const resetAt = Date.now() + getSecondsUntilMidnight() * 1000;

    if (count >= FREE_USER_DAILY_LIMIT) {
        return {
            allowed: false,
            remaining: 0,
            resetAt,
            message: `今日 AI 面试次数已用完（${FREE_USER_DAILY_LIMIT}次/天），请明天再试`,
        };
    }

    return {
        allowed: true,
        remaining,
        resetAt,
        message: `今日剩余 ${remaining} 次`,
    };
}

export async function incrementInterviewCount(
    redis: Redis,
    userId: string
): Promise<number> {
    const todayKey = getTodayKey();
    const key = `${INTERVIEW_RATE_LIMIT_PREFIX}${userId}:${todayKey}`;
    const ttl = getSecondsUntilMidnight();
    
    const count = await redis.incr(key);
    
    // 设置过期时间（如果是第一次设置）
    if (count === 1) {
        await redis.expire(key, ttl);
    }
    
    return count;
}

export async function getInterviewUsage(
    redis: Redis,
    userId: string,
    userRole: string = 'user'
): Promise<{ used: number; limit: number; remaining: number }> {
    if (userRole === 'admin' || userRole === 'premium') {
        return { used: 0, limit: -1, remaining: -1 };
    }

    const todayKey = getTodayKey();
    const key = `${INTERVIEW_RATE_LIMIT_PREFIX}${userId}:${todayKey}`;
    const count = await redis.get<number>(key) || 0;
    
    return {
        used: count,
        limit: FREE_USER_DAILY_LIMIT,
        remaining: Math.max(0, FREE_USER_DAILY_LIMIT - count),
    };
}

export interface QuestionLimitResult {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    message: string;
}

export function checkQuestionLimit(
    questionCount: number,
    userRole: string = 'user'
): QuestionLimitResult {
    if (userRole === 'admin' || userRole === 'premium') {
        return {
            allowed: true,
            current: questionCount,
            limit: -1,
            remaining: -1,
            message: '无限制',
        };
    }

    if (questionCount >= FREE_USER_QUESTION_LIMIT) {
        return {
            allowed: false,
            current: questionCount,
            limit: FREE_USER_QUESTION_LIMIT,
            remaining: 0,
            message: `本次面试已达到问题上限（${FREE_USER_QUESTION_LIMIT}个问题），请结束面试查看反馈`,
        };
    }

    return {
        allowed: true,
        current: questionCount,
        limit: FREE_USER_QUESTION_LIMIT,
        remaining: FREE_USER_QUESTION_LIMIT - questionCount,
        message: `剩余 ${FREE_USER_QUESTION_LIMIT - questionCount} 个问题`,
    };
}

export { FREE_USER_QUESTION_LIMIT };
