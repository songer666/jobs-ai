export interface InterviewItem {
  id: string;
  userId: string;
  jobInfoId: string;
  duration: number | null;
  chatId: string | null;
  feedback: string | null;
  score: number | null;
  status: 'pending' | 'in_progress' | 'evaluating' | 'completed' | null;
  createdAt: number;
  updatedAt: number;
  jobInfo?: {
    id: string;
    name: string;
    title: string | null;
    experienceLevel: string;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface InterviewManagementProps {
  title?: string;
  subTitle?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}
