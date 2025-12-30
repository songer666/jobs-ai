import { z } from "@hono/zod-openapi";
import {
    interviewStatusEnum,
    interviewLanguageEnum,
    aiModelEnum,
    createInterviewRequestSchema,
    updateInterviewRequestSchema,
} from "../schema/interview-schema";

export type InterviewStatus = z.infer<typeof interviewStatusEnum>;
export type InterviewLanguage = z.infer<typeof interviewLanguageEnum>;
export type AIModel = z.infer<typeof aiModelEnum>;

export interface Interview {
    id: string;
    userId: string;
    jobInfoId: string;
    duration: number | null;
    chatId: string | null;
    feedback: string | null;
    score: number | null;
    status: InterviewStatus | null;
    language: InterviewLanguage | null;
    model: AIModel | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface InterviewWithJobInfo extends Interview {
    jobInfo: {
        id: string;
        name: string;
        title: string | null;
        description: string | null;
        experienceLevel: string;
    } | null;
}

export type CreateInterviewRequest = z.infer<typeof createInterviewRequestSchema>;
export type UpdateInterviewRequest = z.infer<typeof updateInterviewRequestSchema>;

export interface CreateInterviewData extends CreateInterviewRequest {
    userId: string;
    chatId?: string;
}

export interface UpdateInterviewData extends UpdateInterviewRequest {
    chatId?: string;
}

export interface InterviewMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface JobInfoForAI {
    title: string | null;
    description: string;
    experienceLevel: string;
}
