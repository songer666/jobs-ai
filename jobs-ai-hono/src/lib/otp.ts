import type { Redis } from '@upstash/redis';

const OTP_RATE_LIMIT_PREFIX = 'otp:rate_limit:';

export type OTPType = 'email-verification' | 'forget-password' | 'sign-in';

export interface OTPConfig {
    expiresInSeconds?: number;
    rateLimitSeconds?: number;
    codeLength?: number;
}

const defaultConfig: Required<OTPConfig> = {
    expiresInSeconds: 300, // 5分钟
    rateLimitSeconds: 60,  // 60秒内只能发送一次
    codeLength: 6,
};

export async function checkRateLimit(
    redis: Redis,
    identifier: string,
    type: OTPType,
    config: OTPConfig = {}
): Promise<{ canSend: boolean; remainingTime?: number; message: string }> {
    const { rateLimitSeconds } = { ...defaultConfig, ...config };
    const key = `${OTP_RATE_LIMIT_PREFIX}${type}:${identifier}`;
    
    const lastSendTime = await redis.get<number>(key);
    
    if (!lastSendTime) {
        return { canSend: true, message: '可以发送' };
    }
    
    const now = Date.now();
    const elapsed = Math.floor((now - lastSendTime) / 1000);
    const remainingTime = rateLimitSeconds - elapsed;
    
    if (remainingTime > 0) {
        return {
            canSend: false,
            remainingTime,
            message: `请在 ${remainingTime} 秒后重试`,
        };
    }
    
    return { canSend: true, message: '可以发送' };
}
