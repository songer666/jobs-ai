/** API 基础配置 */
export const API_CONFIG = {
  /** 后端服务基础地址 */
  BASE_URL: 'https://jobs-ai-hono.ysyswenjoy.workers.dev/',
  
  /** API 路径前缀 */
  API_PREFIX: '/api',
};

/** API 路径配置 */
export const API_PATHS = {
  /** Admin Dashboard */
  ADMIN_DASHBOARD: {
    STATS: '/admin/dashboard/stats',
  },

  /** Admin 用户管理相关 */
  ADMIN_USER: {
    /** 验证邮箱 */
    VERIFY_EMAIL: '/admin/user/verify-email',
    /** 获取用户会话 */
    GET_SESSIONS: (userId: string) => `/admin/user/sessions/${userId}`,
    /** 删除指定会话 */
    DELETE_SESSION: (sessionId: string) => `/admin/user/sessions/${sessionId}`,
    /** 删除用户所有会话 */
    DELETE_USER_SESSIONS: (userId: string) => `/admin/user/sessions/user/${userId}`,
    /** 获取用户信息 */
    GET_PROFILE: (userId: string) => `/admin/user/profile/${userId}`,
    /** 更新用户信息 */
    UPDATE_PROFILE: (userId: string) => `/admin/user/profile/${userId}`,
    /** 获取用户统计 */
    STATS: '/admin/user/stats/overview',
  },

  ADMIN_CONTACT: {
    GET_ALL: '/admin/contact',
    GET_BY_ID: (id: string) => `/admin/contact/${id}`,
    UPDATE_STATUS: (id: string) => `/admin/contact/${id}/status`,
    DELETE: (id: string) => `/admin/contact/${id}`,
  },

  ADMIN_INTERVIEW: {
    LIST: '/admin/interview',
    DETAIL: (id: string) => `/admin/interview/${id}`,
    DELETE: (id: string) => `/admin/interview/${id}`,
    STATS: '/admin/interview/stats/overview',
  },

  ADMIN_RESUME: {
    LIST: '/admin/resume',
    DETAIL: (id: string) => `/admin/resume/${id}`,
    DELETE: (id: string) => `/admin/resume/${id}`,
    STATS: '/admin/resume/stats/overview',
  },

  ADMIN_QUESTION: {
    LIST: '/admin/question',
    DETAIL: (id: string) => `/admin/question/${id}`,
    DELETE: (id: string) => `/admin/question/${id}`,
    STATS: '/admin/question/stats/overview',
  },

  ADMIN_RESUME_ANALYSIS: {
    LIST: '/admin/resume-analysis',
    DETAIL: (id: string) => `/admin/resume-analysis/${id}`,
    DELETE: (id: string) => `/admin/resume-analysis/${id}`,
    STATS: '/admin/resume-analysis/stats/overview',
  },
};

/** 获取完整 API URL */
export const getApiUrl = (path: string) => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}${path}`;
};
