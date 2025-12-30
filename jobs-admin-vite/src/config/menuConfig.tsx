import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  CrownOutlined,
  MailOutlined,
  CommentOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';

const menuConfig = {
  route: {
    path: '/',
    routes: [
      {
        path: '/dashboard',
        name: '工作台',
        icon: <DashboardOutlined />,
      },
      {
        path: '/users',
        name: '用户管理',
        icon: <TeamOutlined />,
        routes: [
          {
            path: '/users/admins',
            name: '管理员用户',
            icon: <CrownOutlined />,
          },
          {
            path: '/users/normal',
            name: '普通用户',
            icon: <UserOutlined />,
          },
        ],
      },
      {
        path: '/interview/list',
        name: '面试管理',
        icon: <CommentOutlined />,
      },
      {
        path: '/resume/list',
        name: '简历管理',
        icon: <FileTextOutlined />,
      },
      {
        path: '/question/list',
        name: '题目管理',
        icon: <QuestionCircleOutlined />,
      },
      {
        path: '/resume-analysis/list',
        name: '简历分析',
        icon: <FileSearchOutlined />,
      },
      {
        path: '/contact/list',
        name: '联系消息',
        icon: <MailOutlined />,
      },
    ],
  },
};

export default menuConfig;
