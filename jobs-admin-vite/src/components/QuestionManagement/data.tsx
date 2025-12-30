import type { ProColumns } from '@ant-design/pro-components';
import { Tag, Space } from 'antd';
import type { QuestionItem } from './type';

const difficultyMap = {
  easy: { text: '简单', color: 'success' },
  medium: { text: '中等', color: 'warning' },
  hard: { text: '困难', color: 'error' },
};

export const createColumns = (
  onViewDetail: (record: QuestionItem) => void,
  onDelete: (id: string) => void
): ProColumns<QuestionItem>[] => [
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
    title: '题目内容',
    dataIndex: 'text',
    width: 300,
    ellipsis: true,
  },
  {
    title: '关联职位',
    dataIndex: ['jobInfo', 'name'],
    width: 200,
    ellipsis: true,
    render: (_, record) => (
      <div>
        {record.jobInfo ? (
          <>
            <div style={{ fontWeight: 500 }}>{record.jobInfo.name}</div>
            {record.jobInfo.title && (
              <div style={{ fontSize: 12, color: '#666' }}>{record.jobInfo.title}</div>
            )}
          </>
        ) : '-'}
      </div>
    ),
  },
  {
    title: '难度',
    dataIndex: 'difficulty',
    width: 100,
    render: (_, record) => {
      const difficulty = record.difficulty;
      const config = difficultyMap[difficulty as keyof typeof difficultyMap];
      return <Tag color={config?.color}>{config?.text || difficulty}</Tag>;
    },
  },
  {
    title: '分数',
    dataIndex: 'score',
    width: 80,
    render: (_, record) => {
      const score = record.score;
      if (score === null || score === undefined) return '-';
      return <span style={{ fontWeight: 500, color: score >= 60 ? '#52c41a' : '#ff4d4f' }}>{score}</span>;
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
