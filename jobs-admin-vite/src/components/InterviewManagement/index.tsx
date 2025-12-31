import { useState, useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { Modal, Drawer, Timeline, Descriptions, Tag, Space } from 'antd';
import { interviewApi } from '../../api/interview';
import { useMessage } from '../../hooks/useMessage';
import type { InterviewItem, InterviewManagementProps, ChatMessage } from './type';
import { createColumns } from './data';

const InterviewManagement = ({ title = '面试管理', subTitle = '查看和管理所有面试记录' }: InterviewManagementProps) => {
  const actionRef = useRef<ActionType>(null);
  const { message } = useMessage();
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<InterviewItem | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleViewDetail = async (record: InterviewItem) => {
    setDetailLoading(true);
    setDetailDrawerVisible(true);
    setSelectedInterview(record);
    
    try {
      const res = await interviewApi.getDetail(record.id);
      if (res.success && res.interview) {
        setSelectedInterview(res.interview);
        setChatMessages(res.interview.messages || []);
      }
    } catch (error) {
      message.error('获取面试详情失败');
      console.error(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这条面试记录吗？',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await interviewApi.delete(id);
          if (res.success) {
            message.success('删除成功');
            actionRef.current?.reload();
          } else {
            message.error(res.message || '删除失败');
          }
        } catch (error) {
          message.error('删除失败');
          console.error(error);
        }
      },
    });
  };

  const statusMap = {
    pending: { text: '待开始', color: 'default' },
    in_progress: { text: '进行中', color: 'processing' },
    evaluating: { text: '评估中', color: 'warning' },
    completed: { text: '已完成', color: 'success' },
  };

  return (
    <PageContainer title={title} subTitle={subTitle}>
      <ProTable<InterviewItem>
        actionRef={actionRef}
        columns={createColumns(handleViewDetail, handleDelete)}
        request={async (params) => {
          try {
            const res = await interviewApi.getList({
              page: params.current,
              pageSize: params.pageSize,
            });
            
            // 前端搜索过滤
            let filteredData = res.interviews || [];
            if (params.userName) {
              const searchText = String(params.userName).toLowerCase();
              filteredData = filteredData.filter((item: InterviewItem) => 
                item.user?.name?.toLowerCase().includes(searchText) ||
                item.user?.email?.toLowerCase().includes(searchText)
              );
            }
            
            return {
              data: filteredData,
              success: res.success,
              total: filteredData.length,
            };
          } catch (error) {
            message.error('获取面试列表失败');
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        rowKey="id"
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
        }}
        search={{
          labelWidth: 'auto',
        }}
        scroll={{ x: 1200 }}
        options={{
          reload: true,
          density: true,
          setting: true,
        }}
      />

      <Drawer
        title="面试详情"
        size="large"
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedInterview(null);
          setChatMessages([]);
        }}
        loading={detailLoading}
      >
        {selectedInterview && (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" column={2} bordered>
              <Descriptions.Item label="面试ID">{selectedInterview.id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {selectedInterview.status && (
                  <Tag color={statusMap[selectedInterview.status as keyof typeof statusMap]?.color}>
                    {statusMap[selectedInterview.status as keyof typeof statusMap]?.text}
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="职位名称">{selectedInterview.jobInfo?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="职位标题">{selectedInterview.jobInfo?.title || '-'}</Descriptions.Item>
              <Descriptions.Item label="分数">
                {selectedInterview.score !== null ? (
                  <span style={{ fontWeight: 500, color: selectedInterview.score >= 60 ? '#52c41a' : '#ff4d4f' }}>
                    {selectedInterview.score}
                  </span>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="时长">
                {selectedInterview.duration ? `${Math.round(selectedInterview.duration / 60)} 分钟` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {new Date(selectedInterview.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            {selectedInterview.feedback && (
              <div>
                <h3>面试反馈</h3>
                <div style={{ 
                  padding: '12px', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedInterview.feedback}
                </div>
              </div>
            )}

            {chatMessages.length > 0 && (
              <div>
                <h3>对话记录</h3>
                <Timeline
                  items={chatMessages.map((msg) => ({
                    color: msg.role === 'user' ? 'blue' : 'green',
                    content: (
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>
                          {msg.role === 'user' ? '👤 用户' : '🤖 AI面试官'}
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                            {new Date(msg.createdAt).toLocaleTimeString('zh-CN')}
                          </span>
                        </div>
                        <div style={{ 
                          padding: '8px 12px', 
                          background: msg.role === 'user' ? '#e6f7ff' : '#f6ffed',
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ),
                  }))}
                />
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default InterviewManagement;
