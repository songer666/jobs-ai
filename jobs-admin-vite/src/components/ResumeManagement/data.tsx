import type { ProColumns } from '@ant-design/pro-components';
import { Tag, Space } from 'antd';
import type { ResumeItem } from './type';

const statusMap = {
  draft: { text: '草稿', color: 'default' },
  generated: { text: '已生成', color: 'processing' },
  optimized: { text: '已优化', color: 'success' },
};

export const createColumns = (
  onViewDetail: (record: ResumeItem) => void,
  onDelete: (id: string) => void
): ProColumns<ResumeItem>[] => [
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
    title: '简历名称',
    dataIndex: 'name',
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
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (_, record) => {
      const status = record.status;
      const config = statusMap[status as keyof typeof statusMap];
      return <Tag color={config?.color}>{config?.text || status}</Tag>;
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
