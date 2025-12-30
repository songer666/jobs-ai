export interface UserItem {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  image?: string;
  banned?: boolean;
  banReason?: string;
}

export interface UserManagementProps {
  title: string;
  subTitle: string;
  userRole: 'admin' | 'user';
}
