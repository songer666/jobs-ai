import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, desc, count } from "drizzle-orm";
import { interview, resume, resumeAnalysis, question, jobInfo } from "../db/schema";
import type { DashboardData, DashboardActivity } from "../type/dashboard-type";

// Redis key 前缀
const INTERVIEW_RATE_LIMIT_PREFIX = 'rate_limit:interview:';
const RESUME_GENERATE_LIMIT_PREFIX = 'rate_limit:resume_generate:';
const RESUME_ANALYZE_LIMIT_PREFIX = 'rate_limit:resume_analyze:';
const QUESTION_RATE_LIMIT_PREFIX = 'rate_limit:question:';

// 限制配置
const FREE_USER_DAILY_INTERVIEW_LIMIT = 10;
const FREE_USER_DAILY_GENERATE_LIMIT = 20;
const FREE_USER_DAILY_ANALYZE_LIMIT = 20;
const FREE_USER_DAILY_QUESTION_LIMIT = 20;

function getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export class DashboardService {
    constructor(private db: DrizzleD1Database<any>) {}

    async getDashboardData(userId: string, redis: any, userRole: string = 'user'): Promise<DashboardData> {
        const todayKey = getTodayKey();
        const isAdmin = userRole === 'admin';

        // 并行获取所有数据
        const [
            interviewCount,
            resumeCount,
            analysisCount,
            questionCount,
            interviews,
            resumes,
            analyses,
            questions,
            interviewUsed,
            generateUsed,
            analyzeUsed,
            questionUsed,
        ] = await Promise.all([
            // 获取总数统计
            this.db.select({ count: count() }).from(interview).where(eq(interview.userId, userId)).then(r => r[0]?.count || 0),
            this.db.select({ count: count() }).from(resume).where(eq(resume.userId, userId)).then(r => r[0]?.count || 0),
            this.db.select({ count: count() }).from(resumeAnalysis).where(eq(resumeAnalysis.userId, userId)).then(r => r[0]?.count || 0),
            this.db.select({ count: count() }).from(question).where(eq(question.userId, userId)).then(r => r[0]?.count || 0),
            
            // 获取面试列表（关联 jobInfo 获取职位名称）
            this.db.select({
                id: interview.id,
                score: interview.score,
                createdAt: interview.createdAt,
                jobTitle: jobInfo.title,
            })
            .from(interview)
            .leftJoin(jobInfo, eq(interview.jobInfoId, jobInfo.id))
            .where(eq(interview.userId, userId))
            .orderBy(desc(interview.createdAt))
            .limit(10),
            
            // 获取简历列表
            this.db.select({
                id: resume.id,
                name: resume.name,
                createdAt: resume.createdAt,
            })
            .from(resume)
            .where(eq(resume.userId, userId))
            .orderBy(desc(resume.createdAt))
            .limit(10),
            
            // 获取分析列表
            this.db.select({
                id: resumeAnalysis.id,
                fileName: resumeAnalysis.fileName,
                score: resumeAnalysis.score,
                createdAt: resumeAnalysis.createdAt,
            })
            .from(resumeAnalysis)
            .where(eq(resumeAnalysis.userId, userId))
            .orderBy(desc(resumeAnalysis.createdAt))
            .limit(10),
            
            // 获取题目列表
            this.db.select({
                id: question.id,
                text: question.text,
                score: question.score,
                createdAt: question.createdAt,
            })
            .from(question)
            .where(eq(question.userId, userId))
            .orderBy(desc(question.createdAt))
            .limit(10),
            
            // 获取使用量
            redis.get(`${INTERVIEW_RATE_LIMIT_PREFIX}${userId}:${todayKey}`) as Promise<number | null>,
            redis.get(`${RESUME_GENERATE_LIMIT_PREFIX}${userId}:${todayKey}`) as Promise<number | null>,
            redis.get(`${RESUME_ANALYZE_LIMIT_PREFIX}${userId}:${todayKey}`) as Promise<number | null>,
            redis.get(`${QUESTION_RATE_LIMIT_PREFIX}${userId}:${todayKey}`) as Promise<number | null>,
        ]);

        // 构建最近活动列表
        const recentActivities: DashboardActivity[] = [
            ...interviews.slice(0, 3).map(i => ({
                type: 'interview' as const,
                id: i.id,
                title: i.jobTitle || 'AI 面试',
                date: i.createdAt.getTime(),
                score: i.score,
            })),
            ...resumes.slice(0, 3).map(r => ({
                type: 'resume' as const,
                id: r.id,
                title: r.name,
                date: r.createdAt.getTime(),
                score: null,
            })),
            ...analyses.slice(0, 3).map(a => ({
                type: 'analysis' as const,
                id: a.id,
                title: a.fileName,
                date: a.createdAt.getTime(),
                score: a.score,
            })),
            ...questions.slice(0, 3).map(q => ({
                type: 'question' as const,
                id: q.id,
                title: (q.text && q.text.length > 50 ? q.text.substring(0, 50) + '...' : q.text) || '练习题目',
                date: q.createdAt.getTime(),
                score: q.score,
            })),
        ].sort((a, b) => b.date - a.date).slice(0, 5);

        return {
            stats: {
                interviewCount,
                resumeCount,
                analysisCount,
                questionCount,
            },
            usage: {
                interview: {
                    used: interviewUsed || 0,
                    limit: isAdmin ? 100 : FREE_USER_DAILY_INTERVIEW_LIMIT,
                },
                generate: {
                    used: generateUsed || 0,
                    limit: isAdmin ? 100 : FREE_USER_DAILY_GENERATE_LIMIT,
                },
                analyze: {
                    used: analyzeUsed || 0,
                    limit: isAdmin ? 100 : FREE_USER_DAILY_ANALYZE_LIMIT,
                },
                question: {
                    used: questionUsed || 0,
                    limit: isAdmin ? 100 : FREE_USER_DAILY_QUESTION_LIMIT,
                },
            },
            recentActivities,
        };
    }
}
