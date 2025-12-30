import { getApiUrl, API_PATHS } from '../lib/config';

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

export interface InterviewDetail extends InterviewItem {
  messages?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
  }>;
}

export interface InterviewListResponse {
  success: boolean;
  interviews: InterviewItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InterviewDetailResponse {
  success: boolean;
  interview: InterviewDetail;
}

export interface InterviewStatsResponse {
  success: boolean;
  stats: {
    total: number;
    today: number;
    completed: number;
    avgScore: number | null;
  };
}

export const interviewApi = {
  async getList(params?: {
    userId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<InterviewListResponse> {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', params.userId);
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));

    const url = `${getApiUrl(API_PATHS.ADMIN_INTERVIEW.LIST)}${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      credentials: 'include',
    });
    return res.json();
  },

  async getDetail(id: string): Promise<InterviewDetailResponse> {
    const res = await fetch(getApiUrl(API_PATHS.ADMIN_INTERVIEW.DETAIL(id)), {
      credentials: 'include',
    });
    return res.json();
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(getApiUrl(API_PATHS.ADMIN_INTERVIEW.DELETE(id)), {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.json();
  },

  async getStats(): Promise<InterviewStatsResponse> {
    const res = await fetch(getApiUrl(API_PATHS.ADMIN_INTERVIEW.STATS), {
      credentials: 'include',
    });
    return res.json();
  },
};
