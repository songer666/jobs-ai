import type { ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, Popconfirm } from 'antd';
import { DeleteOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ContactMessage, ContactStatus } from './type';

export const getStatusTag = (status: ContactStatus) => {
  const statusMap = {
    pending: { color: 'orange', text: '待处理' },
    replied: { color: 'blue', text: '已回复' },
    closed: { color: 'default', text: '已关闭' },
  };
  const config = statusMap[status];
  return <Tag color={config.color}>{config.text}</Tag>;
};

export const createColumns = (
  onView: (record: ContactMessage) => void,
  onUpdateStatus: (id: string, status: ContactStatus) => void,
  onDelete: (id: string) => void
): ProColumns<ContactMessage>[] => [
  {
    title: '姓名',
    dataIndex: 'name',
    width: 100,
    ellipsis: true,
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    width: 180,
    ellipsis: true,
    copyable: true,
  },
  {
    title: '主题',
    dataIndex: 'subject',
    width: 200,
    ellipsis: true,
  },
  {
    title: '消息内容',
    dataIndex: 'message',
    ellipsis: true,
    width: 250,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (_, record) => getStatusTag(record.status),
    filters: [
      { text: '待处理', value: 'pending' },
      { text: '已回复', value: 'replied' },
      { text: '已关闭', value: 'closed' },
    ],
    onFilter: (value, record) => record.status === value,
  },
  {
    title: 'IP地址',
    dataIndex: 'ip',
    width: 130,
    ellipsis: true,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 160,
    sorter: (a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime();
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime();
      return timeA - timeB;
    },
    render: (_, record) => {
      const time = typeof record.createdAt === 'number' 
        ? new Date(record.createdAt).toLocaleString()
        : new Date(record.createdAt).toLocaleString();
      return time;
    },
  },
  {
    title: '操作',
    width: 200,
    fixed: 'right',
    render: (_, record) => (
      <Space size={0}>
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onView(record)}
        >
          查看
        </Button>
        {record.status === 'pending' && (
          <Button
            type="link"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => onUpdateStatus(record.id, 'replied')}
          >
            标记已回复
          </Button>
        )}
        {record.status !== 'closed' && (
          <Button
            type="link"
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => onUpdateStatus(record.id, 'closed')}
          >
            关闭
          </Button>
        )}
        <Popconfirm
          title="确认删除"
          description="确定要删除这条消息吗?"
          onConfirm={() => onDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
];
