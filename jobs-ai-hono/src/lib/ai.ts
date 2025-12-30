import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText, streamText } from 'ai';
import type { JobInfoForAI, InterviewMessage, InterviewLanguage } from '../type/user/interview-type';
import {
    getInterviewQuestionSystemPrompt,
    getInterviewFeedbackSystemPrompt,
    getQuestionFeedbackSystemPrompt,
} from './prompt/interview-prompt';

export function createAIModels(env: CloudflareBindings) {
    const gemini = createOpenAI({
        apiKey: env.GEMINI_API_KEY,
    });

    const deepseek = createDeepSeek({
        apiKey: env.DEEPSEEK_API_KEY,
    });

    return {
        gemini: gemini('gemini-2.0-flash-exp'),
        deepseek: deepseek('deepseek-chat'),
    };
}

export type AIModelType = 'gemini' | 'deepseek';

export async function generateInterviewQuestion(
    env: CloudflareBindings,
    jobInfo: JobInfoForAI,
    previousMessages: InterviewMessage[] = [],
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    language: InterviewLanguage = 'zh',
    modelType: AIModelType = 'gemini',
    questionNumber: number = 1,
    isLastQuestion: boolean = false
) {
    const models = createAIModels(env);
    const model = modelType === 'deepseek' ? models.deepseek : models.gemini;

    const systemPrompt = getInterviewQuestionSystemPrompt(jobInfo, difficulty, language, questionNumber, isLastQuestion);

    return streamText({
        model,
        messages: [
            ...previousMessages.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            { role: 'user' as const, content: `Generate question ${questionNumber}` },
        ],
        system: systemPrompt,
    });
}

export async function generateInterviewFeedback(
    env: CloudflareBindings,
    jobInfo: JobInfoForAI,
    conversationHistory: InterviewMessage[],
    userName: string,
    language: InterviewLanguage = 'zh',
    modelType: AIModelType = 'gemini'
) {
    const models = createAIModels(env);
    const model = modelType === 'deepseek' ? models.deepseek : models.gemini;

    const systemPrompt = getInterviewFeedbackSystemPrompt(jobInfo, userName, language);

    const { text } = await generateText({
        model,
        messages: conversationHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
        })),
        system: systemPrompt,
    });

    return text;
}

export async function generateQuestionFeedback(
    env: CloudflareBindings,
    question: string,
    answer: string,
    language: InterviewLanguage = 'zh',
    modelType: AIModelType = 'gemini'
) {
    const models = createAIModels(env);
    const model = modelType === 'deepseek' ? models.deepseek : models.gemini;

    const systemPrompt = getQuestionFeedbackSystemPrompt(question, language);

    return streamText({
        model,
        prompt: answer,
        system: systemPrompt,
    });
}
