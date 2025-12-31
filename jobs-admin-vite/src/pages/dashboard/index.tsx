import { useState, useEffect } from 'react';
import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { Row, Col, Spin } from 'antd';
import {
  TeamOutlined,
  CommentOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  FileSearchOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSessionCache } from '../../lib/session-provider';
import { dashboardApi } from '../../api/dashboard';
import type { DashboardStats, RecentContact, RecentUser } from '../../api/dashboard';
import styles from './index.module.css';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2'];

const DashboardPage = () => {
  const { session } = useSessionCache();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await dashboardApi.getStats();
        if (res.success) {
          setStats(res.stats);
          setRecentContacts(res.recentContacts || []);
          setRecentUsers(res.recentUsers || []);
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const moduleData = stats ? [
    { name: '用户', value: stats.totalUsers, color: COLORS[5] },
    { name: '面试', value: stats.totalInterviews, color: COLORS[0] },
    { name: '简历', value: stats.totalResumes, color: COLORS[1] },
    { name: '题目', value: stats.totalQuestions, color: COLORS[2] },
    { name: '简历分析', value: stats.totalResumeAnalyses, color: COLORS[3] },
    { name: '联系消息', value: stats.totalContacts, color: COLORS[4] },
  ] : [];

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: '工作台',
        subTitle: `欢迎回来，${session?.user?.name || '管理员'}！`,
      }}
    >
      <div className={styles.content}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <StatisticCard
              statistic={{
                title: '用户总数',
                value: stats?.totalUsers || 0,
                icon: <TeamOutlined style={{ fontSize: 32, color: COLORS[5] }} />,
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatisticCard
              statistic={{
                title: '面试管理',
                value: stats?.totalInterviews || 0,
                icon: <CommentOutlined style={{ fontSize: 32, color: COLORS[0] }} />,
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatisticCard
              statistic={{
                title: '简历管理',
                value: stats?.totalResumes || 0,
                icon: <FileTextOutlined style={{ fontSize: 32, color: COLORS[1] }} />,
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatisticCard
              statistic={{
                title: '题目管理',
                value: stats?.totalQuestions || 0,
                icon: <QuestionCircleOutlined style={{ fontSize: 32, color: COLORS[2] }} />,
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatisticCard
              statistic={{
                title: '简历分析',
                value: stats?.totalResumeAnalyses || 0,
                icon: <FileSearchOutlined style={{ fontSize: 32, color: COLORS[3] }} />,
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatisticCard
              statistic={{
                title: '联系消息',
                value: stats?.totalContacts || 0,
                icon: <MailOutlined style={{ fontSize: 32, color: COLORS[4] }} />,
              }}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <ProCard title="模块数据分布" bordered>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={moduleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {moduleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ProCard>
          </Col>
          <Col xs={24} lg={12}>
            <ProCard title="数据对比" bordered>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={moduleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1890ff" />
                </BarChart>
              </ResponsiveContainer>
            </ProCard>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <ProCard title="最近联系消息" bordered>
              {recentContacts.length > 0 ? (
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  {recentContacts.map((contact) => (
                    <div key={contact.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>{contact.name}</span>
                        <span style={{ fontSize: 12, color: '#999' }}>
                          {new Date(contact.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{contact.email}</div>
                      <div style={{ fontSize: 13, color: '#333' }}>
                        {contact.message.length > 50 ? `${contact.message.substring(0, 50)}...` : contact.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  暂无联系消息
                </div>
              )}
            </ProCard>
          </Col>
          <Col xs={24} lg={12}>
            <ProCard title="最近新增用户" bordered>
              {recentUsers.length > 0 ? (
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  {recentUsers.map((user) => (
                    <div key={user.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>{user.name}</span>
                        <span style={{ fontSize: 12, color: '#999' }}>
                          {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{user.email}</div>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          background: user.role === 'admin' ? '#ff4d4f' : '#1890ff',
                          color: '#fff'
                        }}>
                          {user.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  暂无新增用户
                </div>
              )}
            </ProCard>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
