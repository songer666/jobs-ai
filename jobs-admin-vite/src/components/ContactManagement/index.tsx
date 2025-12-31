import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { Space, Drawer, Descriptions } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useRef, useState, useCallback, useMemo } from 'react';
import { contactApi } from '../../api/contact';
import { useMessage } from '../../hooks/useMessage';
import type { ContactMessage, ContactStatus, ContactManagementProps } from './type';
import { createColumns, getStatusTag } from './data';

const ContactManagement = ({ 
  title = '联系消息管理', 
  subTitle = '管理用户提交的联系表单' 
}: ContactManagementProps) => {
  const { message } = useMessage();
  const actionRef = useRef<ActionType>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const fetchMessages = async () => {
    try {
      const response = await contactApi.getAll();
      if (response.success) {
        return { data: response.data, success: true };
      }
      message.error('获取消息列表失败');
      return { data: [], success: false };
    } catch (err) {
      console.error(err);
      message.error('获取消息列表失败');
      return { data: [], success: false };
    }
  };

  const handleUpdateStatus = async (id: string, status: ContactStatus) => {
    try {
      const response = await contactApi.updateStatus(id, status);
      if (response.success) {
        message.success('状态更新成功');
        actionRef.current?.reload();
      } else {
        message.error('状态更新失败');
      }
    } catch {
      message.error('状态更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await contactApi.delete(id);
      if (response.success) {
        message.success('删除成功');
        actionRef.current?.reload();
        if (selectedMessage?.id === id) {
          setDrawerOpen(false);
        }
      } else {
        message.error('删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  };

  const handleViewDetail = useCallback(async (record: ContactMessage) => {
    setSelectedMessage(record);
    setDrawerOpen(true);
    if (record.status === 'pending') {
      await handleUpdateStatus(record.id, 'replied');
    }
  }, [handleUpdateStatus]);

  const columns = useMemo(
    () => createColumns(handleViewDetail, handleUpdateStatus, handleDelete),
    [handleViewDetail, handleUpdateStatus, handleDelete]
  );

  return (
    <PageContainer
      header={{
        title,
        subTitle,
      }}
    >
      <ProTable<ContactMessage>
        columns={columns}
        actionRef={actionRef}
        request={fetchMessages}
        rowKey="id"
        search={false}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        dateFormatter="string"
        headerTitle={
          <Space>
            <MailOutlined />
            <span>联系消息列表</span>
          </Space>
        }
        scroll={{ x: 1400 }}
      />

      <Drawer
        title="消息详情"
        placement="right"
        size="default"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedMessage && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="姓名">
              {selectedMessage.name}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {selectedMessage.email}
            </Descriptions.Item>
            <Descriptions.Item label="主题">
              {selectedMessage.subject}
            </Descriptions.Item>
            <Descriptions.Item label="消息内容">
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedMessage.message}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {getStatusTag(selectedMessage.status)}
            </Descriptions.Item>
            <Descriptions.Item label="IP地址">
              {selectedMessage.ip || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="User Agent">
              <div style={{ wordBreak: 'break-all', fontSize: '12px' }}>
                {selectedMessage.userAgent || '-'}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {typeof selectedMessage.createdAt === 'number'
                ? new Date(selectedMessage.createdAt).toLocaleString()
                : new Date(selectedMessage.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {typeof selectedMessage.updatedAt === 'number'
                ? new Date(selectedMessage.updatedAt).toLocaleString()
                : new Date(selectedMessage.updatedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default ContactManagement;
