import { useState, useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { Modal, Drawer, Descriptions, Space } from 'antd';
import { resumeAnalysisApi } from '../../api/resume-analysis';
import { useMessage } from '../../hooks/useMessage';
import type { ResumeAnalysisItem, ResumeAnalysisManagementProps } from './type';
import { createColumns } from './data';

const ResumeAnalysisManagement = ({ title = '简历分析管理', subTitle = '查看和管理所有简历分析记录' }: ResumeAnalysisManagementProps) => {
  const actionRef = useRef<ActionType>(null);
  const { message } = useMessage();
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ResumeAnalysisItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleViewDetail = async (record: ResumeAnalysisItem) => {
    setDetailLoading(true);
    setDetailDrawerVisible(true);
    setSelectedAnalysis(record);
    
    try {
      const res = await resumeAnalysisApi.getDetail(record.id);
      if (res.success && res.analysis) {
        setSelectedAnalysis(res.analysis);
      }
    } catch (error) {
      message.error('获取简历分析详情失败');
      console.error(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这条简历分析记录吗？',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await resumeAnalysisApi.delete(id);
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

  return (
    <PageContainer title={title} subTitle={subTitle}>
      <ProTable<ResumeAnalysisItem>
        actionRef={actionRef}
        columns={createColumns(handleViewDetail, handleDelete)}
        request={async (params) => {
          try {
            const res = await resumeAnalysisApi.getList({
              page: params.current,
              pageSize: params.pageSize,
            });
            
            // 前端搜索过滤
            let filteredData = res.analyses || [];
            if (params.userName) {
              const searchText = String(params.userName).toLowerCase();
              filteredData = filteredData.filter((item: ResumeAnalysisItem) => 
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
            message.error('获取简历分析列表失败');
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
        title="简历分析详情"
        size="large"
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedAnalysis(null);
        }}
        loading={detailLoading}
      >
        {selectedAnalysis && (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" column={2} bordered>
              <Descriptions.Item label="分析ID">{selectedAnalysis.id}</Descriptions.Item>
              <Descriptions.Item label="文件名">{selectedAnalysis.fileName}</Descriptions.Item>
              <Descriptions.Item label="关联职位" span={2}>
                {selectedAnalysis.jobInfo ? `${selectedAnalysis.jobInfo.name} - ${selectedAnalysis.jobInfo.title}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="评分">
                {selectedAnalysis.score !== null && selectedAnalysis.score !== undefined ? (
                  <span style={{ fontWeight: 500, color: selectedAnalysis.score >= 60 ? '#52c41a' : '#ff4d4f' }}>
                    {selectedAnalysis.score}
                  </span>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedAnalysis.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            {selectedAnalysis.jobDescription && (
              <div>
                <h3>职位描述</h3>
                <div style={{ 
                  padding: '12px', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedAnalysis.jobDescription}
                </div>
              </div>
            )}

            {selectedAnalysis.feedback && (
              <div>
                <h3>分析反馈</h3>
                <div style={{ 
                  padding: '12px', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedAnalysis.feedback}
                </div>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default ResumeAnalysisManagement;
