export interface QuestionItem {
  id: string;
  userId: string;
  jobInfoId: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  answer?: string;
  feedback?: string;
  score?: number;
  createdAt: number;
  updatedAt: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  jobInfo?: {
    id: string;
    name: string;
    title: string;
  };
}

export interface QuestionManagementProps {
  title?: string;
  subTitle?: string;
}
