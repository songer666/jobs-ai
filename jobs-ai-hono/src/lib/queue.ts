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
 * 发送面试评分任务到 QStash 消息队列
 * 
 * @param qstashToken - QStash API Token
 * @param callbackUrl - Webhook 回调地址
 * @param payload - 评分任务数据
 * @returns QStash 响应
 * 
 * @description
 * 将面试评分任务发送到 QStash，由 Webhook 异步处理评分生成。
 * 支持重试3次，确保评分任务不会丢失。
 */
export async function publishEvaluateInterview(
    qstashToken: string,
    callbackUrl: string,
    payload: EvaluateInterviewPayload
) {
    const response = await fetch("https://qstash.upstash.io/v2/publish/" + encodeURIComponent(callbackUrl), {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${qstashToken}`,
            "Content-Type": "application/json",
            "Upstash-Retries": "3", // 失败重试3次
        },
        body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`QStash publish failed: ${error}`);
    }
    
    return response.json();
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
    delaySeconds: number
) {
    const response = await fetch("https://qstash.upstash.io/v2/publish/" + encodeURIComponent(callbackUrl), {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${qstashToken}`,
            "Content-Type": "application/json",
            "Upstash-Delay": `${delaySeconds}s`, // 延迟执行
            "Upstash-Retries": "0", // 不重试，避免重复结束
        },
        body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`QStash schedule failed: ${error}`);
    }
    
    return response.json();
}