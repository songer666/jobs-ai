export interface ResumeItem {
  id: string;
  userId: string;
  jobInfoId?: string;
  name: string;
  content?: string;
  stylePrompt?: string;
  status: 'draft' | 'generated' | 'optimized';
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

export interface ResumeManagementProps {
  title?: string;
  subTitle?: string;
}
