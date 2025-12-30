import { ProForm, ProFormText } from '@ant-design/pro-components';
import { userApi, type UserProfile } from '../../api/user';
import { useMessage } from '../../hooks/useMessage';

interface ProfileFormProps {
  profile: UserProfile | null;
  userId: string;
  onSuccess: (profile: UserProfile) => void;
}

const ProfileForm = ({ profile, userId, onSuccess }: ProfileFormProps) => {
  const { message } = useMessage();

  const handleSubmit = async (values: { name?: string; username?: string; email?: string }) => {
    if (!userId) return;
    try {
      const data = await userApi.updateProfile(userId, values);
      if (data.success) {
        message.success('更新成功');
        onSuccess(data.user);
      } else {
        message.error(data.message || '更新失败');
      }
    } catch {
      message.error('更新失败');
    }
  };

  return (
    <ProForm
      initialValues={profile || {}}
      onFinish={handleSubmit}
      submitter={{
        searchConfig: {
          submitText: '保存修改',
        },
        resetButtonProps: {
          style: { display: 'none' },
        },
      }}
    >
      <ProFormText
        name="name"
        label="姓名"
        placeholder="请输入姓名"
        rules={[{ required: true, message: '请输入姓名' }]}
      />
      <ProFormText
        name="username"
        label="用户名"
        placeholder="请输入用户名"
        rules={[{ required: true, message: '请输入用户名' }]}
      />
      <ProFormText
        name="email"
        label="邮箱"
        placeholder="请输入邮箱"
        rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}
      />
    </ProForm>
  );
};

export default ProfileForm;
