import { Redis } from '@upstash/redis/cloudflare';

export function createRedis(env: CloudflareBindings): Redis {
    return new Redis({
        url: env.REDIS_REST_URL,
        token: env.REDIS_REST_TOKEN,
    });
}