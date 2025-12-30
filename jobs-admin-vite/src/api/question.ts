import { getApiUrl, API_PATHS } from '../lib/config';

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

export interface QuestionListResponse {
  success: boolean;
  questions: QuestionItem[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
}

export interface QuestionDetailResponse {
  success: boolean;
  question: QuestionItem;
  message?: string;
}

export interface QuestionStatsResponse {
  success: boolean;
  stats: {
    total: number;
    easy: number;
    medium: number;
    hard: number;
  };
  message?: string;
}

export const questionApi = {
  getList: async (params: { userId?: string; page?: number; pageSize?: number }): Promise<QuestionListResponse> => {
    const url = new URL(getApiUrl(API_PATHS.ADMIN_QUESTION.LIST));
    if (params.userId) url.searchParams.append('userId', params.userId);
    if (params.page) url.searchParams.append('page', params.page.toString());
    if (params.pageSize) url.searchParams.append('pageSize', params.pageSize.toString());
    
    const response = await fetch(url.toString(), {
      credentials: 'include',
    });
    return response.json();
  },

  getDetail: async (id: string): Promise<QuestionDetailResponse> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_QUESTION.DETAIL(id)), {
      credentials: 'include',
    });
    return response.json();
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_QUESTION.DELETE(id)), {
      method: 'DELETE',
      credentials: 'include',
    });
    return response.json();
  },

  getStats: async (): Promise<QuestionStatsResponse> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_QUESTION.STATS), {
      credentials: 'include',
    });
    return response.json();
  },
};
