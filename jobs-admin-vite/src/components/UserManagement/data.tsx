import type { ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, Avatar, Popconfirm } from 'antd';
import { UserOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined, KeyOutlined, UserSwitchOutlined, CrownOutlined, HistoryOutlined, SafetyOutlined } from '@ant-design/icons';
import type { UserItem } from './type';

export const createColumns = (
  userRole: 'admin' | 'user',
  onPasswordClick: (user: UserItem) => void,
  onSessionsClick: (user: UserItem) => void,
  onToggleEmailVerified: (userId: string, currentVerified: boolean) => void,
  onToggleRole: (userId: string) => void,
  onBanUser: (userId: string) => void,
  onUnbanUser: (userId: string) => void,
  onRemoveUser: (userId: string) => void
): ProColumns<UserItem>[] => [
  {
    title: '用户',
    dataIndex: 'name',
    width: 120,
    ellipsis: true,
    render: (_, record) => (
      <Space>
        <Avatar src={record.image} icon={<UserOutlined />} size="small" />
        {record.name}
      </Space>
    ),
  },
  {
    title: '用户名',
    dataIndex: 'username',
    width: 100,
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    ellipsis: true,
    width: 180,
  },
  {
    title: '状态',
    dataIndex: 'banned',
    width: 80,
    render: (_, record) => (
      <Tag color={record.banned ? 'red' : 'green'}>
        {record.banned ? '已封禁' : '正常'}
      </Tag>
    ),
  },
  {
    title: '邮箱验证',
    dataIndex: 'emailVerified',
    width: 80,
    render: (_, record) => (
      <Tag color={record.emailVerified ? 'green' : 'orange'}>
        {record.emailVerified ? '已验证' : '未验证'}
      </Tag>
    ),
  },
  {
    title: '注册时间',
    dataIndex: 'createdAt',
    width: 160,
    render: (_, record) => new Date(record.createdAt).toLocaleString(),
  },
  {
    title: '操作',
    width: 320,
    render: (_, record) => {
      // 保护 admin 用户不被删除和重置密码
      const isProtectedAdmin = record.username === 'admin';
      
      return (
        <Space size={0} wrap>
          <Button
            type="link"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => onPasswordClick(record)}
            disabled={isProtectedAdmin}
            title={isProtectedAdmin ? '系统管理员账户不可重置密码' : undefined}
          >
            密码
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => onSessionsClick(record)}
          >
            会话
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SafetyOutlined />}
            disabled={isProtectedAdmin}
            onClick={() => onToggleEmailVerified(record.id, record.emailVerified)}
          >
            {record.emailVerified ? '取消验证' : '验证'}
          </Button>
          <Popconfirm
            title={userRole === 'admin' ? '确定降级为普通用户吗？' : '确定升级为管理员吗？'}
            onConfirm={() => onToggleRole(record.id)}
            disabled={isProtectedAdmin}
          >
            <Button 
              type="link" 
              size="small" 
              icon={userRole === 'admin' ? <UserSwitchOutlined /> : <CrownOutlined />}
              disabled={isProtectedAdmin}
              title={isProtectedAdmin ? '系统管理员账户不可降级' : undefined}
            >
              {userRole === 'admin' ? '降级' : '升级'}
            </Button>
          </Popconfirm>
          {record.banned ? (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => onUnbanUser(record.id)}>
              解封
            </Button>
          ) : (
            <Popconfirm title="确定封禁该用户吗？" onConfirm={() => onBanUser(record.id)} disabled={isProtectedAdmin}>
              <Button 
                type="link" 
                size="small" 
                icon={<StopOutlined />}
                disabled={isProtectedAdmin}
                title={isProtectedAdmin ? '系统管理员账户不可封禁' : undefined}
              >
                封禁
              </Button>
            </Popconfirm>
          )}
          <Popconfirm title="确定删除该用户吗？" onConfirm={() => onRemoveUser(record.id)} disabled={isProtectedAdmin}>
            <Button 
              type="link" 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
              disabled={isProtectedAdmin}
              title={isProtectedAdmin ? '系统管理员账户不可删除' : undefined}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      );
    },
  },
];
