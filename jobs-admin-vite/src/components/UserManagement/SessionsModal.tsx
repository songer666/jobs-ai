import { Modal, Table, Button, Popconfirm, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { userApi } from '../../api/user';
import { useMessage } from '../../hooks/useMessage';

interface SessionItem {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  createdAt: number;
  ipAddress: string;
  userAgent: string;
}

interface SessionsModalProps {
  open: boolean;
  userId: string;
  userName: string;
  onCancel: () => void;
}

const SessionsModal = ({ open, userId, userName, onCancel }: SessionsModalProps) => {
  const { message } = useMessage();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await userApi.getUserSessions(userId);
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) {
      fetchSessions();
    }
  }, [open, userId]);

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const data = await userApi.deleteSession(sessionId);
      if (data.success) {
        message.success('会话已删除');
        fetchSessions();
      } else {
        message.error('删除失败');
      }
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleDeleteAllSessions = async () => {
    try {
      const data = await userApi.deleteUserSessions(userId);
      if (data.success) {
        message.success('所有会话已删除');
        fetchSessions();
      } else {
        message.error('删除失败');
      }
    } catch (err) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      width: 120,
      render: (ip: string) => ip || '-',
    },
    {
      title: '设备',
      dataIndex: 'userAgent',
      ellipsis: true,
      render: (ua: string) => ua?.substring(0, 50) || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (ts: number) => new Date(ts).toLocaleString(),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      width: 160,
      render: (ts: number) => {
        const isExpired = ts < Date.now();
        return (
          <Tag color={isExpired ? 'red' : 'green'}>
            {new Date(ts).toLocaleString()}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, record: SessionItem) => (
        <Popconfirm title="确定删除该会话吗？" onConfirm={() => handleDeleteSession(record.id)}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title={`${userName} 的会话管理`}
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Popconfirm key="deleteAll" title="确定删除该用户的所有会话吗？" onConfirm={handleDeleteAllSessions}>
          <Button danger>删除所有会话</Button>
        </Popconfirm>,
        <Button key="close" onClick={onCancel}>关闭</Button>,
      ]}
    >
      <Table
        columns={columns}
        dataSource={sessions}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
      />
    </Modal>
  );
};

export default SessionsModal;
