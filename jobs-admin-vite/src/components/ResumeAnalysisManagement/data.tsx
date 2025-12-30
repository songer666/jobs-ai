import type { ProColumns } from '@ant-design/pro-components';
import { Space } from 'antd';
import type { ResumeAnalysisItem } from './type';

export const createColumns = (
  onViewDetail: (record: ResumeAnalysisItem) => void,
  onDelete: (id: string) => void
): ProColumns<ResumeAnalysisItem>[] => [
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
    title: '文件名',
    dataIndex: 'fileName',
    width: 200,
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
    title: '评分',
    dataIndex: 'score',
    width: 80,
    render: (_, record) => {
      const score = record.score;
      if (score === null || score === undefined) return '-';
      return <span style={{ fontWeight: 500, color: score >= 60 ? '#52c41a' : '#ff4d4f' }}>{score}</span>;
    },
    sorter: (a, b) => (a.score || 0) - (b.score || 0),
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
