import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { admin } from '../../lib/auth-client';
import { useRef, useState, useMemo } from 'react';
import styles from './index.module.css';
import CreateUserModal from './CreateUserModal';
import ResetPasswordModal from './ResetPasswordModal';
import SessionsModal from './SessionsModal';
import { userApi } from '../../api/user';
import { useMessage } from '../../hooks/useMessage';
import type { UserItem, UserManagementProps } from './type';
import { createColumns } from './data';

const UserManagement = ({ title, subTitle, userRole }: UserManagementProps) => {
  const { message } = useMessage();
  const actionRef = useRef<ActionType>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const { data, error } = await admin.listUsers({
        query: {
          limit: 100,
          filterField: 'role',
          filterValue: userRole,
        },
      });
      if (error) {
        message.error('获取用户列表失败');
        return { data: [], success: false };
      }
      return { data: (data?.users || []) as UserItem[], success: true };
    } catch (err) {
      console.error(err);
      return { data: [], success: false };
    }
  };

  // 创建用户
  const handleCreateUser = async (values: { email: string; password: string; name: string; username: string }) => {
    try {
      const { error } = await admin.createUser({
        email: values.email,
        password: values.password,
        name: values.name,
        role: userRole,
        data: {
          username: values.username,
          displayUsername: values.username,
        },
      });
      if (error) {
        message.error('创建失败: ' + error.message);
        return false;
      }
      message.success('创建成功');
      actionRef.current?.reload();
      return true;
    } catch {
      message.error('创建失败');
      return false;
    }
  };

  // 删除用户
  const handleRemoveUser = async (userId: string) => {
    try {
      const { error } = await admin.removeUser({ userId });
      if (error) {
        message.error('删除失败');
        return;
      }
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  // 封禁用户
  const handleBanUser = async (userId: string) => {
    try {
      const { error } = await admin.banUser({ userId, banReason: '管理员操作' });
      if (error) {
        message.error('封禁失败');
        return;
      }
      message.success('封禁成功');
      actionRef.current?.reload();
    } catch {
      message.error('封禁失败');
    }
  };

  // 解封用户
  const handleUnbanUser = async (userId: string) => {
    try {
      const { error } = await admin.unbanUser({ userId });
      if (error) {
        message.error('解封失败');
        return;
      }
      message.success('解封成功');
      actionRef.current?.reload();
    } catch {
      message.error('解封失败');
    }
  };

  // 切换角色
  const handleToggleRole = async (userId: string) => {
    const newRole = userRole === 'admin' ? 'user' : 'admin';
    try {
      const { error } = await admin.setRole({ userId, role: newRole });
      if (error) {
        message.error('操作失败');
        return;
      }
      message.success(newRole === 'admin' ? '已升级为管理员' : '已降级为普通用户');
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  // 重置密码
  const handleSetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    try {
      const { error } = await admin.setUserPassword({ userId: selectedUser.id, newPassword });
      if (error) {
        message.error('重置密码失败');
        return;
      }
      message.success('密码重置成功');
      setPasswordModalOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch {
      message.error('重置密码失败');
    }
  };

  // 切换邮箱验证状态
  const handleToggleEmailVerified = async (userId: string, currentVerified: boolean) => {
    try {
      const data = await userApi.verifyEmail(userId, !currentVerified);
      if (data.success) {
        message.success(data.message);
        actionRef.current?.reload();
      } else {
        message.error('操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  };

  const columns = useMemo(
    () => createColumns(
      userRole,
      (user) => {
        setSelectedUser(user);
        setPasswordModalOpen(true);
      },
      (user) => {
        setSelectedUser(user);
        setSessionsModalOpen(true);
      },
      handleToggleEmailVerified,
      handleToggleRole,
      handleBanUser,
      handleUnbanUser,
      handleRemoveUser
    ),
    [userRole, handleToggleEmailVerified, handleToggleRole, handleBanUser, handleUnbanUser, handleRemoveUser]
  );

  return (
    <PageContainer
      header={{
        title,
        subTitle,
      }}
    >
      <ProTable<UserItem>
        columns={columns}
        actionRef={actionRef}
        request={fetchUsers}
        rowKey="id"
        search={false}
        pagination={{ pageSize: 10 }}
        size="small"
        className={styles.table}
        toolBarRender={() => [
          <Button type="primary" key="create" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            {userRole === 'admin' ? '添加管理员' : '添加用户'}
          </Button>,
        ]}
      />

      <CreateUserModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onFinish={handleCreateUser}
        userRole={userRole}
      />

      <ResetPasswordModal
        open={passwordModalOpen}
        userName={selectedUser?.name || ''}
        password={newPassword}
        onPasswordChange={setNewPassword}
        onOk={handleSetPassword}
        onCancel={() => {
          setPasswordModalOpen(false);
          setNewPassword('');
          setSelectedUser(null);
        }}
      />

      <SessionsModal
        open={sessionsModalOpen}
        userId={selectedUser?.id || ''}
        userName={selectedUser?.name || ''}
        onCancel={() => {
          setSessionsModalOpen(false);
          setSelectedUser(null);
        }}
      />
    </PageContainer>
  );
};

export default UserManagement;
