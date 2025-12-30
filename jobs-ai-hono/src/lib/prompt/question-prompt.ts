export type QuestionLanguage = 'zh' | 'en';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface JobInfoContext {
    title: string | null;
    description: string;
    experienceLevel: string;
}

export interface PreviousQuestion {
    text: string;
    difficulty: QuestionDifficulty;
}

const languageConfig = {
    zh: {
        outputLanguage: 'Chinese',
        referToCandidate: '你',
    },
    en: {
        outputLanguage: 'English',
        referToCandidate: 'you',
    },
};

export function getQuestionGenerationPrompt(
    jobInfo: JobInfoContext,
    difficulty: QuestionDifficulty,
    previousQuestions: PreviousQuestion[] = [],
    language: QuestionLanguage = 'zh'
): string {
    const lang = languageConfig[language];
    
    const previousQuestionsContext = previousQuestions.length > 0
        ? `\n\nPrevious questions asked (DO NOT repeat these topics):\n${previousQuestions.map((q, i) => `${i + 1}. [${q.difficulty}] ${q.text}`).join('\n')}`
        : '';

    return `You are an AI assistant that creates **programming-focused** technical interview questions tailored to a specific job role. Your task is to generate one **hands-on coding question** that matches the skill requirements of the job and aligns with the difficulty level provided.

Job Information:
- Job Description: \`${jobInfo.description}\`
- Experience Level: \`${jobInfo.experienceLevel}\`
${jobInfo.title ? `- Job Title: \`${jobInfo.title}\`` : ''}
${previousQuestionsContext}

Guidelines:
- **IMPORTANT: Keep the question SHORT and CONCISE.** The entire question should be answerable in 5-10 minutes.
- **IMPORTANT: The question should encourage the candidate to express their understanding through code.**
- Question types (mix these two types):
  1. **Explain with Code**: A short conceptual question requiring a code example. Example: "What is a closure? Show with a simple example."
  2. **Pure Coding Challenge**: A focused coding task. Example: "Write a function to reverse a string."
- Keep requirements minimal - focus on ONE core concept or task.
- Do NOT include lengthy background stories or complex multi-part requirements.
- If providing code snippets, keep them under 10 lines.
- Difficulty level: "${difficulty}"
  - easy: One simple concept or function (2-3 min to answer)
  - medium: One practical problem (5-7 min to answer)
  - hard: One challenging problem (8-10 min to answer)
- Return only the question. Do not include the answer.
- The question should be formatted as markdown.
- Output in ${lang.outputLanguage}.
- **IMPORTANT: Each question must cover a DIFFERENT topic from previous questions.**`;
}

export function getQuestionFeedbackPrompt(
    question: string,
    language: QuestionLanguage = 'zh'
): string {
    const lang = languageConfig[language];
    
    const outputFormat = language === 'zh'
        ? `## 评分反馈 (Rating: <评分>/10)
<反馈内容>

---

## 参考答案
<完整的正确答案>`
        : `## Rating Feedback (Rating: <rating>/10)
<feedback content>

---

## Reference Answer
<the full correct answer>`;

    return `You are an expert technical interviewer. Your job is to evaluate the candidate's answer to a technical interview question. Use ${lang.outputLanguage} for your response.

The original question was:
\`\`\`
${question}
\`\`\`

Instructions:
- Review the candidate's answer (provided in the user prompt).
- Assign a rating from **1 to 10**, where:
  - 10 = Perfect, complete, and well-articulated
  - 7-9 = Mostly correct, with minor issues or room for optimization
  - 4-6 = Partially correct or incomplete
  - 1-3 = Largely incorrect or missing the point
- Provide **concise, constructive feedback** on what was done well and what could be improved.
- Be honest but professional.
- Include a full correct answer in the output.
- Refer to the candidate as "${lang.referToCandidate}" in your feedback.
- **IMPORTANT: Use Markdown syntax for formatting**, including:
  - Use \`##\` for section headers
  - Use \`**bold**\` for emphasis
  - Use \`\`\`language\`\`\` for code blocks with language specification
  - Use \`-\` or \`1.\` for lists
  - Keep code examples concise and well-formatted
- Stop generating output as soon you have provided the rating, feedback, and full correct answer.

Output Format (strictly follow this Markdown structure):
${outputFormat}`;
}

export function parseScoreFromFeedback(feedback: string): number | null {
    const patterns = [
        /Rating:\s*(\d+)\/10/i,
        /(\d+)\/10/,
        /评分[：:]\s*(\d+)/,
    ];
    
    for (const pattern of patterns) {
        const match = feedback.match(pattern);
        if (match) {
            const score = parseInt(match[1], 10);
            if (score >= 1 && score <= 10) {
                return score;
            }
        }
    }
    
    return null;
}
