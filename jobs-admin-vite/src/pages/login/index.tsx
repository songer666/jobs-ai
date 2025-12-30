import {
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProConfigProvider,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import { message, theme } from 'antd';
import { useState } from 'react';
import { signIn, signOut, authClient } from '../../lib/auth-client';
import { useSessionCache } from '../../lib/session-provider';
import Logo from '../../components/Logo';
import styles from './index.module.css';

interface LoginFormValues {
  username: string;
  password: string;
  autoLogin?: boolean;
}

const LoginPage = () => {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const { clearAndRefetch } = useSessionCache();

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const { data, error } = await signIn.username({
        username: values.username,
        password: values.password,
      });

      if (error) {
        message.error(error.message || '登录失败，请检查用户名和密码');
        return;
      }

      if (data) {
        // 登录成功后获取完整的 session 信息
        const { data: sessionData } = await authClient.getSession();
        
        // 检查用户角色是否为管理员
        const userRole = (sessionData?.user as { role?: string })?.role;
        if (userRole !== 'admin') {
          message.error('权限不足，只有管理员才能登录此系统');
          await signOut();
          await clearAndRefetch();
          return;
        }
        
        // 清除旧缓存并刷新
        await clearAndRefetch();
        message.success('登录成功！');
        // AuthGuard 会自动处理跳转到 dashboard
      }
    } catch (err) {
      console.error('登录错误:', err);
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProConfigProvider hashed={false}>
      <div className={styles.container} style={{ backgroundColor: token.colorBgContainer }}>
        <LoginForm<LoginFormValues>
          logo={<Logo size={48} />}
          title="Exam AI"
          subTitle="AI学习、试卷生成管理平台"
          onFinish={handleSubmit}
          submitter={{
            searchConfig: {
              submitText: '登录',
            },
            submitButtonProps: {
              loading,
              size: 'large',
              style: { width: '100%' },
            },
          }}
        >
          <ProFormText
            name="username"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined className={styles.prefixIcon} />,
            }}
            placeholder="用户名"
            rules={[
              {
                required: true,
                message: '请输入用户名!',
              },
            ]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined className={styles.prefixIcon} />,
            }}
            placeholder="密码"
            rules={[
              {
                required: true,
                message: '请输入密码！',
              },
            ]}
          />

          <div className={styles.loginOptions}>
            <ProFormCheckbox noStyle name="autoLogin">
              自动登录
            </ProFormCheckbox>
            <a className={styles.forgotPassword}>
              忘记密码
            </a>
          </div>
        </LoginForm>
      </div>
    </ProConfigProvider>
  );
};

export default LoginPage;
