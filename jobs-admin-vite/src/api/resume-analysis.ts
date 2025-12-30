import { getApiUrl, API_PATHS } from '../lib/config';

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

export interface ResumeAnalysisListResponse {
  success: boolean;
  analyses: ResumeAnalysisItem[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
}

export interface ResumeAnalysisDetailResponse {
  success: boolean;
  analysis: ResumeAnalysisItem;
  message?: string;
}

export interface ResumeAnalysisStatsResponse {
  success: boolean;
  stats: {
    total: number;
    avgScore: number;
  };
  message?: string;
}

export const resumeAnalysisApi = {
  getList: async (params: { userId?: string; page?: number; pageSize?: number }): Promise<ResumeAnalysisListResponse> => {
    const url = new URL(getApiUrl(API_PATHS.ADMIN_RESUME_ANALYSIS.LIST));
    if (params.userId) url.searchParams.append('userId', params.userId);
    if (params.page) url.searchParams.append('page', params.page.toString());
    if (params.pageSize) url.searchParams.append('pageSize', params.pageSize.toString());
    
    const response = await fetch(url.toString(), {
      credentials: 'include',
    });
    return response.json();
  },

  getDetail: async (id: string): Promise<ResumeAnalysisDetailResponse> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_RESUME_ANALYSIS.DETAIL(id)), {
      credentials: 'include',
    });
    return response.json();
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_RESUME_ANALYSIS.DELETE(id)), {
      method: 'DELETE',
      credentials: 'include',
    });
    return response.json();
  },

  getStats: async (): Promise<ResumeAnalysisStatsResponse> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_RESUME_ANALYSIS.STATS), {
      credentials: 'include',
    });
    return response.json();
  },
};
