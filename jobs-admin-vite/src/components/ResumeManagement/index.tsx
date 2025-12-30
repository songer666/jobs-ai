import { useState, useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { Modal, Drawer, Descriptions, Tag, Space } from 'antd';
import { resumeApi } from '../../api/resume';
import { useMessage } from '../../hooks/useMessage';
import type { ResumeItem, ResumeManagementProps } from './type';
import { createColumns } from './data';

const ResumeManagement = ({ title = '简历管理', subTitle = '查看和管理所有简历记录' }: ResumeManagementProps) => {
  const actionRef = useRef<ActionType>(null);
  const { message } = useMessage();
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedResume, setSelectedResume] = useState<ResumeItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleViewDetail = async (record: ResumeItem) => {
    setDetailLoading(true);
    setDetailDrawerVisible(true);
    setSelectedResume(record);
    
    try {
      const res = await resumeApi.getDetail(record.id);
      if (res.success && res.resume) {
        setSelectedResume(res.resume);
      }
    } catch (error) {
      message.error('获取简历详情失败');
      console.error(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这条简历记录吗？',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await resumeApi.delete(id);
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
    draft: { text: '草稿', color: 'default' },
    generated: { text: '已生成', color: 'processing' },
    optimized: { text: '已优化', color: 'success' },
  };

  return (
    <PageContainer title={title} subTitle={subTitle}>
      <ProTable<ResumeItem>
        actionRef={actionRef}
        columns={createColumns(handleViewDetail, handleDelete)}
        request={async (params) => {
          try {
            const res = await resumeApi.getList({
              page: params.current,
              pageSize: params.pageSize,
            });
            
            // 前端搜索过滤
            let filteredData = res.resumes || [];
            if (params.userName) {
              const searchText = String(params.userName).toLowerCase();
              filteredData = filteredData.filter((item: ResumeItem) => 
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
            message.error('获取简历列表失败');
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
        title="简历详情"
        size="large"
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedResume(null);
        }}
        loading={detailLoading}
      >
        {selectedResume && (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" column={2} bordered>
              <Descriptions.Item label="简历ID">{selectedResume.id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {selectedResume.status && (
                  <Tag color={statusMap[selectedResume.status as keyof typeof statusMap]?.color}>
                    {statusMap[selectedResume.status as keyof typeof statusMap]?.text}
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="简历名称">{selectedResume.name}</Descriptions.Item>
              <Descriptions.Item label="关联职位">
                {selectedResume.jobInfo ? `${selectedResume.jobInfo.name} - ${selectedResume.jobInfo.title}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {new Date(selectedResume.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间" span={2}>
                {new Date(selectedResume.updatedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            {selectedResume.stylePrompt && (
              <div>
                <h3>样式描述</h3>
                <div style={{ 
                  padding: '12px', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedResume.stylePrompt}
                </div>
              </div>
            )}

            {selectedResume.content && (
              <div>
                <h3>简历内容</h3>
                <div style={{ 
                  padding: '12px', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}>
                  {selectedResume.content}
                </div>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default ResumeManagement;
