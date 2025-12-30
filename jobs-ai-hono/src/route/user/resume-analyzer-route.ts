import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { streamText } from "ai";
import { nextCors } from "../../lib/cors";
import { authMiddleware } from "../../lib/auth-middleware";
import { getDb } from "../../db";
import { createRedis } from "../../lib/redis";
import { createAIModels } from "../../lib/ai";
import { 
    errorResponseSchema, 
    resumeAnalysisResponseSchema, 
    resumeAnalysisListResponseSchema 
} from "../../schema/resume-schema";
import { getResumeAnalysisPrompt } from "../../lib/prompt/resume-prompt";
import { JobInfoService } from "../../service/job-info-service";
import { ResumeAnalysisService } from "../../service/resume-service";

type Variables = {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
        [key: string]: unknown;
    };
};

// Redis 限流配置
const RESUME_ANALYZE_LIMIT_PREFIX = 'rate_limit:resume_analyze:';
const FREE_USER_DAILY_ANALYZE_LIMIT = 20;

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

async function checkAnalyzeRateLimit(redis: any, userId: string, userRole: string = 'user') {
    if (userRole === 'admin' || userRole === 'premium') {
        return { allowed: true, remaining: -1 };
    }
    const todayKey = getTodayKey();
    const key = `${RESUME_ANALYZE_LIMIT_PREFIX}${userId}:${todayKey}`;
    const count = (await redis.get(key) as number) || 0;
    if (count >= FREE_USER_DAILY_ANALYZE_LIMIT) {
        return {
            allowed: false,
            remaining: 0,
            message: `今日简历分析次数已用完（${FREE_USER_DAILY_ANALYZE_LIMIT}次/天），请明天再试`,
        };
    }
    return { allowed: true, remaining: FREE_USER_DAILY_ANALYZE_LIMIT - count };
}

async function incrementAnalyzeCount(redis: any, userId: string) {
    const todayKey = getTodayKey();
    const key = `${RESUME_ANALYZE_LIMIT_PREFIX}${userId}:${todayKey}`;
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, getSecondsUntilMidnight());
    }
    return count;
}

// R2 服务
class ResumeAnalysisR2Service {
    private bucket: R2Bucket;

    constructor(bucket: R2Bucket) {
        this.bucket = bucket;
    }

    private generatePdfKey(userId: string, analysisId: string, fileName: string): string {
        const ext = fileName.split('.').pop() || 'pdf';
        return `${userId}/analysis/${analysisId}/resume-${Date.now()}.${ext}`;
    }

    async uploadPdf(userId: string, analysisId: string, file: File): Promise<{ r2Key: string }> {
        const r2Key = this.generatePdfKey(userId, analysisId, file.name);
        const arrayBuffer = await file.arrayBuffer();
        await this.bucket.put(r2Key, arrayBuffer, {
            httpMetadata: { contentType: file.type },
        });
        return { r2Key };
    }

    async getFile(r2Key: string): Promise<R2ObjectBody | null> {
        return this.bucket.get(r2Key);
    }

    async deleteFile(r2Key: string): Promise<void> {
        try {
            await this.bucket.delete(r2Key);
        } catch (e) {
            console.error('删除 R2 文件失败:', e);
        }
    }
}

const resumeAnalyzerRoute = new OpenAPIHono<{ Bindings: CloudflareBindings; Variables: Variables }>();

resumeAnalyzerRoute.use("/*", nextCors);

// ==================== 分析列表 ====================
const getAnalysesRoute = createRoute({
    method: "get",
    path: "/analyses",
    tags: ["Resume Analyzer"],
    summary: "获取我的简历分析列表",
    responses: {
        200: { content: { "application/json": { schema: resumeAnalysisListResponseSchema } }, description: "获取成功" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
    },
});

resumeAnalyzerRoute.use(getAnalysesRoute.getRoutingPath(), authMiddleware);
resumeAnalyzerRoute.openapi(getAnalysesRoute, async (c) => {
    const db = getDb(c.env);
    const service = new ResumeAnalysisService(db);
    const user = c.get("user");
    const analyses = await service.findByUserId(user.id);
    const formattedAnalyses = analyses.map(a => ({
        ...a,
        createdAt: a.createdAt.getTime(),
        updatedAt: a.updatedAt.getTime(),
    }));
    return c.json({ success: true, analyses: formattedAnalyses }, 200);
});

// ==================== 分析详情 ====================
const getAnalysisRoute = createRoute({
    method: "get",
    path: "/analyses/{id}",
    tags: ["Resume Analyzer"],
    summary: "获取简历分析详情",
    request: { params: z.object({ id: z.string() }) },
    responses: {
        200: { content: { "application/json": { schema: resumeAnalysisResponseSchema } }, description: "获取成功" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
        403: { content: { "application/json": { schema: errorResponseSchema } }, description: "无权访问" },
        404: { content: { "application/json": { schema: errorResponseSchema } }, description: "未找到" },
    },
});

resumeAnalyzerRoute.use(getAnalysisRoute.getRoutingPath(), authMiddleware);
resumeAnalyzerRoute.openapi(getAnalysisRoute, async (c) => {
    const db = getDb(c.env);
    const service = new ResumeAnalysisService(db);
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const analysis = await service.findById(id);
    if (!analysis) return c.json({ success: false, message: "分析记录不存在" }, 404);
    
    if (analysis.userId !== user.id) {
        return c.json({ success: false, message: "无权访问此分析记录" }, 403);
    }

    const formattedAnalysis = {
        ...analysis,
        createdAt: analysis.createdAt.getTime(),
        updatedAt: analysis.updatedAt.getTime(),
    };
    return c.json({ success: true, analysis: formattedAnalysis }, 200);
});

// ==================== 删除分析 ====================
const deleteAnalysisRoute = createRoute({
    method: "delete",
    path: "/analyses/{id}",
    tags: ["Resume Analyzer"],
    summary: "删除简历分析",
    request: { params: z.object({ id: z.string() }) },
    responses: {
        200: { content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string() }) } }, description: "删除成功" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
        403: { content: { "application/json": { schema: errorResponseSchema } }, description: "无权访问" },
    },
});

resumeAnalyzerRoute.use(deleteAnalysisRoute.getRoutingPath(), authMiddleware);
resumeAnalyzerRoute.openapi(deleteAnalysisRoute, async (c) => {
    const db = getDb(c.env);
    const service = new ResumeAnalysisService(db);
    const r2Service = new ResumeAnalysisR2Service(c.env["jobs-ai"]);
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const analysis = await service.findById(id);
    if (!analysis || analysis.userId !== user.id) {
        return c.json({ success: false, message: "无权删除此分析记录" }, 403);
    }

    // 删除 R2 中的 PDF 文件
    if (analysis.pdfR2Key) {
        await r2Service.deleteFile(analysis.pdfR2Key);
    }

    await service.delete(id);
    return c.json({ success: true, message: "删除成功" }, 200);
});

// ==================== 上传文件分析简历 ====================
resumeAnalyzerRoute.use("/analyze", authMiddleware);
resumeAnalyzerRoute.post("/analyze", async (c) => {
    const user = c.get("user");
    const redis = createRedis(c.env);
    const db = getDb(c.env);
    const jobInfoService = new JobInfoService(db);
    const analysisService = new ResumeAnalysisService(db);
    const r2Service = new ResumeAnalysisR2Service(c.env["jobs-ai"]);

    // 检查限流
    const rateLimit = await checkAnalyzeRateLimit(redis, user.id, user.role as string);
    if (!rateLimit.allowed) {
        return c.json({ success: false, message: rateLimit.message }, 429);
    }

    // 解析 multipart/form-data
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;
    const jobInfoId = formData.get("jobInfoId") as string | null;
    const language = formData.get("language") as string || 'zh';
    const modelName = formData.get("model") as string || 'deepseek';

    if (!file) {
        return c.json({ success: false, message: "请上传简历文件" }, 400);
    }

    // 验证文件类型 - 只支持 PDF
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        return c.json({ success: false, message: "只支持 PDF 格式" }, 400);
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
        return c.json({ success: false, message: "文件大小不能超过 10MB" }, 400);
    }

    // 先创建分析记录（获取 ID 用于 R2 路径）
    const tempAnalysis = await analysisService.create({
        userId: user.id,
        fileName: file.name,
        pdfR2Key: 'temp', // 临时值，稍后更新
        jobInfoId: jobInfoId || undefined,
        jobDescription: jobDescription || undefined,
    });

    // 上传文件到 R2
    const { r2Key } = await r2Service.uploadPdf(user.id, tempAnalysis.id, file);

    // 更新分析记录的 R2 key
    await analysisService.update(tempAnalysis.id, { pdfR2Key: r2Key } as any);
    
    // 获取职位描述
    let finalJobDescription = jobDescription;
    if (!finalJobDescription && jobInfoId) {
        const jobInfo = await jobInfoService.findById(jobInfoId);
        if (jobInfo) {
            finalJobDescription = jobInfo.description;
        }
    }

    // 获取文件内容作为 Buffer
    const fileBuffer = await file.arrayBuffer();

    const aiModels = createAIModels(c.env);
    const model = modelName === 'gemini' ? aiModels.gemini : aiModels.deepseek;

    // 创建流式响应
    const stream = new ReadableStream({
        async start(controller) {
            try {
                let fullAnalysis = '';

                const systemMessage = language === 'en'
                    ? 'You are a professional resume analysis expert. Please analyze the resume document provided by the user in detail.'
                    : '你是一个专业的简历分析专家。请详细分析用户提供的简历文档。';

                // 构建分析提示词
                const analysisPrompt = finalJobDescription 
                    ? `请分析这份简历，并根据以下职位要求给出专业的评估和建议：\n\n职位要求：\n${finalJobDescription}\n\n请从以下几个方面进行分析：\n1. 简历与职位的匹配度\n2. 简历的优点\n3. 需要改进的地方\n4. 具体的优化建议\n5. 整体评分（1-100分）`
                    : `请对这份简历进行专业分析，包括：\n1. 简历的优点\n2. 需要改进的地方\n3. 具体的优化建议\n4. 整体评分（1-100分）`;

                const result = await streamText({
                    model,
                    system: systemMessage,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'file',
                                    data: fileBuffer,
                                    mediaType: file.type,
                                },
                                {
                                    type: 'text',
                                    text: analysisPrompt,
                                }
                            ],
                        },
                    ],
                    onFinish: async ({ text }) => {
                        fullAnalysis = text;
                        await incrementAnalyzeCount(redis, user.id);

                        // 提取评分
                        let score: number | undefined;
                        const scoreMatch = fullAnalysis.match(/整体评分[：:]\s*(\d+)/) || 
                                          fullAnalysis.match(/Overall Score[：:]\s*(\d+)/i) ||
                                          fullAnalysis.match(/(\d+)\s*[\/／]\s*100/);
                        if (scoreMatch) {
                            score = parseInt(scoreMatch[1], 10);
                        }

                        // 更新分析记录
                        await analysisService.update(tempAnalysis.id, {
                            feedback: fullAnalysis,
                            score: score,
                        });

                        controller.enqueue(
                            new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', analysisId: tempAnalysis.id, score })}\n\n`)
                        );
                        controller.close();
                    },
                });

                for await (const chunk of result.textStream) {
                    controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`)
                    );
                }
            } catch (error) {
                // 出错时删除临时记录
                await analysisService.delete(tempAnalysis.id);
                await r2Service.deleteFile(r2Key);
                
                controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`)
                );
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
});

// ==================== 获取分析使用量 ====================
const getUsageRoute = createRoute({
    method: "get",
    path: "/usage",
    tags: ["Resume Analyzer"],
    summary: "获取今日分析使用量",
    responses: {
        200: { 
            content: { 
                "application/json": { 
                    schema: z.object({
                        success: z.boolean(),
                        usage: z.object({
                            analyzeUsed: z.number(),
                            analyzeLimit: z.number(),
                            analyzeRemaining: z.number(),
                        }),
                    }) 
                } 
            }, 
            description: "获取成功" 
        },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
    },
});

resumeAnalyzerRoute.use(getUsageRoute.getRoutingPath(), authMiddleware);
resumeAnalyzerRoute.openapi(getUsageRoute, async (c) => {
    const user = c.get("user");
    const redis = createRedis(c.env);
    const userRole = user.role as string || 'user';

    if (userRole === 'admin' || userRole === 'premium') {
        return c.json({
            success: true,
            usage: {
                analyzeUsed: 0,
                analyzeLimit: -1,
                analyzeRemaining: -1,
            },
        }, 200);
    }

    const todayKey = getTodayKey();
    const analyzeKey = `${RESUME_ANALYZE_LIMIT_PREFIX}${user.id}:${todayKey}`;
    const analyzeCount = (await redis.get(analyzeKey) as number) || 0;

    return c.json({
        success: true,
        usage: {
            analyzeUsed: analyzeCount,
            analyzeLimit: FREE_USER_DAILY_ANALYZE_LIMIT,
            analyzeRemaining: Math.max(0, FREE_USER_DAILY_ANALYZE_LIMIT - analyzeCount),
        },
    }, 200);
});

// ==================== 获取分析文件（代理 R2） ====================
const getFileRoute = createRoute({
    method: "get",
    path: "/files/{key}",
    tags: ["Resume Analyzer"],
    summary: "获取分析相关文件",
    request: {
        params: z.object({ key: z.string() }),
    },
    responses: {
        200: { description: "文件内容" },
        401: { content: { "application/json": { schema: errorResponseSchema } }, description: "未登录" },
        403: { content: { "application/json": { schema: errorResponseSchema } }, description: "无权访问" },
        404: { content: { "application/json": { schema: errorResponseSchema } }, description: "文件不存在" },
    },
});

resumeAnalyzerRoute.use(getFileRoute.getRoutingPath(), authMiddleware);
resumeAnalyzerRoute.openapi(getFileRoute, async (c) => {
    const r2Service = new ResumeAnalysisR2Service(c.env["jobs-ai"]);
    const user = c.get("user");
    const { key } = c.req.valid("param");

    const decodedKey = decodeURIComponent(key);

    if (!decodedKey.startsWith(`${user.id}/`)) {
        return c.json({ success: false, message: "无权访问此文件" }, 403);
    }

    const file = await r2Service.getFile(decodedKey);
    if (!file) {
        return c.json({ success: false, message: "文件不存在" }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', file.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(file.body, { headers });
});

export default resumeAnalyzerRoute;
