export interface ResumeAnalysisItem {
  id: string;
  userId: string;
  jobInfoId?: string;
  fileName: string;
  pdfR2Key: string;
  feedback?: string;
  score?: number;
  jobDescription?: string;
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

export interface ResumeAnalysisManagementProps {
  title?: string;
  subTitle?: string;
}
