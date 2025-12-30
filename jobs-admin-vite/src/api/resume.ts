import { getApiUrl, API_PATHS } from '../lib/config';

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

export interface ResumeListResponse {
  success: boolean;
  resumes: ResumeItem[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
}

export interface ResumeDetailResponse {
  success: boolean;
  resume: ResumeItem;
  message?: string;
}

export interface ResumeStatsResponse {
  success: boolean;
  stats: {
    total: number;
    draft: number;
    generated: number;
    optimized: number;
  };
  message?: string;
}

export const resumeApi = {
  getList: async (params: { userId?: string; page?: number; pageSize?: number }): Promise<ResumeListResponse> => {
    const url = new URL(getApiUrl(API_PATHS.ADMIN_RESUME.LIST));
    if (params.userId) url.searchParams.append('userId', params.userId);
    if (params.page) url.searchParams.append('page', params.page.toString());
    if (params.pageSize) url.searchParams.append('pageSize', params.pageSize.toString());
    
    const response = await fetch(url.toString(), {
      credentials: 'include',
    });
    return response.json();
  },

  getDetail: async (id: string): Promise<ResumeDetailResponse> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_RESUME.DETAIL(id)), {
      credentials: 'include',
    });
    return response.json();
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_RESUME.DELETE(id)), {
      method: 'DELETE',
      credentials: 'include',
    });
    return response.json();
  },

  getStats: async (): Promise<ResumeStatsResponse> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_RESUME.STATS), {
      credentials: 'include',
    });
    return response.json();
  },
};
