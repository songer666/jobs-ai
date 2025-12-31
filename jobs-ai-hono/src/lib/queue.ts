import { Client } from "@upstash/qstash";

/**
 * 创建 QStash 客户端
 * 支持本地开发服务器和生产环境
 */
function createQStashClient(token: string, baseUrl?: string) {
    if (!token) {
        throw new Error('QStash token is empty or undefined');
    }
    
    const options: { token: string; baseUrl?: string } = { token };
    
    // 如果提供了 baseUrl（本地开发），使用它
    if (baseUrl && baseUrl !== "https://qstash.upstash.io") {
        options.baseUrl = baseUrl;
    }
    
    return new Client(options);
}

/**
 * 面试评分任务的 Payload 类型
 * 用于异步生成面试评分和反馈
 */
export interface EvaluateInterviewPayload {
    interviewId: string;
    jobInfo: {
        title: string;
        description: string;
        experienceLevel: string;
    };
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    userName: string;
    language: string;
    model: 'gemini' | 'deepseek';
}

/**
 * 自动结束面试任务的 Payload 类型
 * 用于在面试开始1小时后自动结束面试
 */
export interface AutoEndInterviewPayload {
    interviewId: string;
}

/**
 * 简历生成任务的 Payload 类型
 * 用于异步生成简历内容
 */
export interface GenerateResumePayload {
    resumeId: string;
    userId: string;
    collectedInfo: Record<string, any>;
    stylePrompt: string;
    jobDescription?: string;
    language: 'zh' | 'en';
    model: 'gemini' | 'deepseek';
}

/**
 * 发送面试评分任务到 QStash 消息队列
 * 
 * @param qstashToken - QStash API Token
 * @param callbackUrl - Webhook 回调地址
 * @param payload - 评分任务数据
 * @param qstashUrl - QStash URL（可选）
 * @returns QStash 响应
 * 
 * @description
 * 将面试评分任务发送到 QStash，由 Webhook 异步处理评分生成。
 * 支持重试3次，确保评分任务不会丢失。
 */
export async function publishEvaluateInterview(
    qstashToken: string,
    callbackUrl: string,
    payload: EvaluateInterviewPayload,
    qstashUrl?: string
) {
    const client = createQStashClient(qstashToken, qstashUrl);
    
    const result = await client.publishJSON({
        url: callbackUrl,
        body: payload,
        retries: 3, // 失败重试3次
    });
    
    return result;
}

/**
 * 安排延迟消息：在指定时间后自动结束面试
 * 
 * @param qstashToken - QStash API Token
 * @param callbackUrl - Webhook 回调地址
 * @param payload - 自动结束任务数据
 * @param delaySeconds - 延迟时间（秒），通常为3600秒（1小时）
 * @returns QStash 响应
 * 
 * @description
 * 在面试开始时调用，安排一个延迟消息。
 * 1小时后 QStash 会自动调用 Webhook 来结束面试。
 * 
 * 注意：
 * - 如果用户在1小时内手动结束面试，Webhook 会检查状态并跳过处理
 * - 不支持重试（Retries=0），避免重复结束面试
 */
export async function scheduleAutoEndInterview(
    qstashToken: string,
    callbackUrl: string,
    payload: AutoEndInterviewPayload,
    delaySeconds: number,
    qstashUrl?: string
) {
    const client = createQStashClient(qstashToken, qstashUrl);
    
    const result = await client.publishJSON({
        url: callbackUrl,
        body: payload,
        delay: delaySeconds, // 延迟执行（秒）
        retries: 0, // 不重试，避免重复结束
    });
    
    return result;
}

/**
 * 发送简历生成任务到 QStash 消息队列
 * 
 * @param qstashToken - QStash API Token
 * @param callbackUrl - Webhook 回调地址
 * @param payload - 生成任务数据
 * @param qstashUrl - QStash URL（可选）
 * @returns QStash 响应
 * 
 * @description
 * 将简历生成任务发送到 QStash，由 Webhook 异步处理生成。
 * 支持重试3次，确保生成任务不会丢失。
 */
export async function publishGenerateResume(
    qstashToken: string,
    callbackUrl: string,
    payload: GenerateResumePayload,
    qstashUrl?: string
) {
    const client = createQStashClient(qstashToken, qstashUrl);
    
    const result = await client.publishJSON({
        url: callbackUrl,
        body: payload,
        retries: 3, // 失败重试3次
    });
    
    return result;
}