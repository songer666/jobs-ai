import { ModalForm, ProFormText } from '@ant-design/pro-components';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinish: (values: { email: string; password: string; name: string; username: string }) => Promise<boolean>;
  userRole: 'admin' | 'user';
}

const CreateUserModal = ({ open, onOpenChange, onFinish, userRole }: CreateUserModalProps) => {
  return (
    <ModalForm
      title={userRole === 'admin' ? '添加管理员' : '添加用户'}
      open={open}
      onOpenChange={onOpenChange}
      onFinish={onFinish}
      width={400}
    >
      <ProFormText name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]} />
      <ProFormText name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]} />
      <ProFormText name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]} />
      <ProFormText.Password name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]} />
    </ModalForm>
  );
};

export default CreateUserModal;
