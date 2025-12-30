import { getApiUrl, API_PATHS } from '../lib/config';

export type ContactStatus = 'pending' | 'replied' | 'closed';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  ip: string | null;
  userAgent: string | null;
  status: ContactStatus;
  createdAt: Date | number;
  updatedAt: Date | number;
}

export interface GetContactMessagesResponse {
  success: boolean;
  data: ContactMessage[];
}

export interface GetContactMessageResponse {
  success: boolean;
  data: ContactMessage;
}

export interface UpdateContactStatusResponse {
  success: boolean;
  data: ContactMessage;
}

export interface DeleteContactMessageResponse {
  success: boolean;
  message: string;
  data: ContactMessage;
}

export const contactApi = {
  async getAll(): Promise<GetContactMessagesResponse> {
    const res = await fetch(getApiUrl(API_PATHS.ADMIN_CONTACT.GET_ALL), {
      credentials: 'include',
    });
    return res.json();
  },

  async getById(id: string): Promise<GetContactMessageResponse> {
    const res = await fetch(getApiUrl(API_PATHS.ADMIN_CONTACT.GET_BY_ID(id)), {
      credentials: 'include',
    });
    return res.json();
  },

  async updateStatus(id: string, status: ContactStatus): Promise<UpdateContactStatusResponse> {
    const res = await fetch(getApiUrl(API_PATHS.ADMIN_CONTACT.UPDATE_STATUS(id)), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  async delete(id: string): Promise<DeleteContactMessageResponse> {
    const res = await fetch(getApiUrl(API_PATHS.ADMIN_CONTACT.DELETE(id)), {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.json();
  },
};
