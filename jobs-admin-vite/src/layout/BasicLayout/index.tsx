import {
  GithubFilled,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth-client';
import { useSessionCache } from '../../lib/session-provider';
import Logo from '../../components/Logo';
import menuConfig from '../../config/menuConfig';
import styles from './index.module.css';

const BasicLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, clearAndRefetch } = useSessionCache();

  const handleLogout = async () => {
    await signOut();
    await clearAndRefetch();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人设置',
      onClick: () => navigate('/settings/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <div className={styles.layoutContainer}>
      <ProLayout
        title="Jobs AI"
        logo={<Logo size={32} />}
        siderWidth={216}
        layout="mix"
        fixSiderbar
        fixedHeader
        {...menuConfig}
        location={{
          pathname: location.pathname,
        }}
        avatarProps={{
          src: session?.user?.image || undefined,
          icon: !session?.user?.image ? <UserOutlined /> : undefined,
          title: session?.user?.name || '用户',
          size: 'small',
          render: (_, dom) => (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              {dom}
            </Dropdown>
          ),
        }}
        actionsRender={() => [
          <GithubFilled key="GithubFilled" onClick={() => window.open('https://github.com', '_blank')} />,
        ]}
        menuItemRender={(item, dom) => (
          <div onClick={() => item.path && navigate(item.path)}>
            {dom}
          </div>
        )}
        onMenuHeaderClick={() => navigate('/dashboard')}
      >
        <Outlet />
      </ProLayout>
    </div>
  );
};

export default BasicLayout;
