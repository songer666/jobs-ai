import type { ProColumns } from '@ant-design/pro-components';
import { Tag, Space } from 'antd';
import type { InterviewItem } from './type';

const statusMap = {
  pending: { text: '待开始', color: 'default' },
  in_progress: { text: '进行中', color: 'processing' },
  evaluating: { text: '评估中', color: 'warning' },
  completed: { text: '已完成', color: 'success' },
};

const experienceLevelMap = {
  junior: '初级',
  'mid-level': '中级',
  senior: '高级',
};

export const createColumns = (
  onViewDetail: (record: InterviewItem) => void,
  onDelete: (id: string) => void
): ProColumns<InterviewItem>[] => [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
    ellipsis: true,
    copyable: true,
  },
  {
    title: '用户',
    dataIndex: ['user', 'name'],
    key: 'userName',
    width: 150,
    render: (_, record) => (
      <div>
        <div style={{ fontWeight: 500 }}>{record.user?.name || '-'}</div>
        <div style={{ fontSize: 12, color: '#999' }}>{record.user?.email || '-'}</div>
      </div>
    ),
  },
  {
    title: '职位信息',
    dataIndex: ['jobInfo', 'name'],
    width: 200,
    ellipsis: true,
    render: (_, record) => (
      <div>
        <div style={{ fontWeight: 500 }}>{record.jobInfo?.name || '-'}</div>
        {record.jobInfo?.title && (
          <div style={{ fontSize: 12, color: '#666' }}>{record.jobInfo.title}</div>
        )}
      </div>
    ),
  },
  {
    title: '经验等级',
    dataIndex: ['jobInfo', 'experienceLevel'],
    width: 100,
    render: (_, record) => {
      const level = record.jobInfo?.experienceLevel;
      return level ? experienceLevelMap[level as keyof typeof experienceLevelMap] || level : '-';
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (_, record) => {
      const status = record.status;
      if (!status) return <Tag>未知</Tag>;
      const config = statusMap[status as keyof typeof statusMap];
      return <Tag color={config?.color}>{config?.text || status}</Tag>;
    },
  },
  {
    title: '分数',
    dataIndex: 'score',
    width: 80,
    render: (_, record) => {
      const score = record.score;
      if (score === null) return '-';
      return <span style={{ fontWeight: 500, color: score >= 60 ? '#52c41a' : '#ff4d4f' }}>{score}</span>;
    },
  },
  {
    title: '时长(分钟)',
    dataIndex: 'duration',
    width: 100,
    render: (_, record) => {
      const duration = record.duration;
      if (!duration) return '-';
      return Math.round(duration / 60);
    },
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 180,
    valueType: 'dateTime',
    sorter: (a, b) => a.createdAt - b.createdAt,
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    render: (_, record) => (
      <Space>
        <a onClick={() => onViewDetail(record)}>查看详情</a>
        <a style={{ color: '#ff4d4f' }} onClick={() => onDelete(record.id)}>删除</a>
      </Space>
    ),
  },
];
