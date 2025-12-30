import type { Redis } from '@upstash/redis';

const OTP_PREFIX = 'otp:';
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

export function generateOTPCode(length: number = 6): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
}

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

export async function saveOTP(
    redis: Redis,
    identifier: string,
    type: OTPType,
    code: string,
    config: OTPConfig = {}
): Promise<void> {
    const { expiresInSeconds, rateLimitSeconds } = { ...defaultConfig, ...config };
    
    const otpKey = `${OTP_PREFIX}${type}:${identifier}`;
    const rateLimitKey = `${OTP_RATE_LIMIT_PREFIX}${type}:${identifier}`;
    
    // 保存验证码
    await redis.setex(otpKey, expiresInSeconds, code);
    
    // 记录发送时间用于频率限制
    await redis.setex(rateLimitKey, rateLimitSeconds, Date.now());
}

export async function verifyOTP(
    redis: Redis,
    identifier: string,
    type: OTPType,
    code: string
): Promise<{ success: boolean; message: string }> {
    const key = `${OTP_PREFIX}${type}:${identifier}`;
    
    const savedCode = await redis.get<string>(key);
    
    if (!savedCode) {
        return { success: false, message: '验证码已过期或不存在' };
    }
    
    if (savedCode !== code) {
        return { success: false, message: '验证码错误' };
    }
    
    // 验证成功后删除验证码
    await redis.del(key);
    
    return { success: true, message: '验证成功' };
}

export async function getOTPStatus(
    redis: Redis,
    identifier: string,
    type: OTPType,
    config: OTPConfig = {}
): Promise<{ canSend: boolean; remainingTime?: number; message: string }> {
    return checkRateLimit(redis, identifier, type, config);
}
