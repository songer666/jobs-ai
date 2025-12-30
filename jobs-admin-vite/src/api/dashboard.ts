import { getApiUrl, API_PATHS } from '../lib/config';

export interface DashboardStats {
  totalUsers: number;
  totalInterviews: number;
  totalResumes: number;
  totalQuestions: number;
  totalResumeAnalyses: number;
  totalContacts: number;
}

export interface RecentContact {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: number;
}

export interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: number;
}

export interface DashboardResponse {
  success: boolean;
  stats: DashboardStats;
  recentContacts: RecentContact[];
  recentUsers: RecentUser[];
  message?: string;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardResponse> => {
    const response = await fetch(getApiUrl(API_PATHS.ADMIN_DASHBOARD.STATS), {
      credentials: 'include',
    });
    return response.json();
  },
};
