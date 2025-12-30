import { useState, useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { Modal, Drawer, Descriptions, Tag, Space } from 'antd';
import { questionApi } from '../../api/question';
import { useMessage } from '../../hooks/useMessage';
import type { QuestionItem, QuestionManagementProps } from './type';
import { createColumns } from './data';

const QuestionManagement = ({ title = '题目管理', subTitle = '查看和管理所有练习题目' }: QuestionManagementProps) => {
  const actionRef = useRef<ActionType>(null);
  const { message } = useMessage();
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleViewDetail = async (record: QuestionItem) => {
    setDetailLoading(true);
    setDetailDrawerVisible(true);
    setSelectedQuestion(record);
    
    try {
      const res = await questionApi.getDetail(record.id);
      if (res.success && res.question) {
        setSelectedQuestion(res.question);
      }
    } catch (error) {
      message.error('获取题目详情失败');
      console.error(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这道题目吗？',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await questionApi.delete(id);
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

  const difficultyMap = {
    easy: { text: '简单', color: 'success' },
    medium: { text: '中等', color: 'warning' },
    hard: { text: '困难', color: 'error' },
  };

  return (
    <PageContainer title={title} subTitle={subTitle}>
      <ProTable<QuestionItem>
        actionRef={actionRef}
        columns={createColumns(handleViewDetail, handleDelete)}
        request={async (params) => {
          try {
            const res = await questionApi.getList({
              page: params.current,
              pageSize: params.pageSize,
            });
            
            // 前端搜索过滤
            let filteredData = res.questions || [];
            if (params.userName) {
              const searchText = String(params.userName).toLowerCase();
              filteredData = filteredData.filter((item: QuestionItem) => 
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
            message.error('获取题目列表失败');
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
        title="题目详情"
        size="large"
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedQuestion(null);
        }}
        loading={detailLoading}
      >
        {selectedQuestion && (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" column={2} bordered>
              <Descriptions.Item label="题目ID">{selectedQuestion.id}</Descriptions.Item>
              <Descriptions.Item label="难度">
                {selectedQuestion.difficulty && (
                  <Tag color={difficultyMap[selectedQuestion.difficulty as keyof typeof difficultyMap]?.color}>
                    {difficultyMap[selectedQuestion.difficulty as keyof typeof difficultyMap]?.text}
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="关联职位" span={2}>
                {selectedQuestion.jobInfo ? `${selectedQuestion.jobInfo.name} - ${selectedQuestion.jobInfo.title}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="分数">
                {selectedQuestion.score !== null && selectedQuestion.score !== undefined ? (
                  <span style={{ fontWeight: 500, color: selectedQuestion.score >= 60 ? '#52c41a' : '#ff4d4f' }}>
                    {selectedQuestion.score}
                  </span>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedQuestion.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <h3>题目内容</h3>
              <div style={{ 
                padding: '12px', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedQuestion.text}
              </div>
            </div>

            {selectedQuestion.answer && (
              <div>
                <h3>用户答案</h3>
                <div style={{ 
                  padding: '12px', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedQuestion.answer}
                </div>
              </div>
            )}

            {selectedQuestion.feedback && (
              <div>
                <h3>反馈评价</h3>
                <div style={{ 
                  padding: '12px', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedQuestion.feedback}
                </div>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default QuestionManagement;
