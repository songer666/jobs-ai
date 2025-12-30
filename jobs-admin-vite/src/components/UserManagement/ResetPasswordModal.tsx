import { Modal, Input } from 'antd';

interface ResetPasswordModalProps {
  open: boolean;
  userName: string;
  password: string;
  onPasswordChange: (password: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

const ResetPasswordModal = ({ open, userName, password, onPasswordChange, onOk, onCancel }: ResetPasswordModalProps) => {
  return (
    <Modal
      title="重置密码"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
    >
      <p>为用户 <strong>{userName}</strong> 设置新密码：</p>
      <Input.Password
        placeholder="请输入新密码"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
      />
    </Modal>
  );
};

export default ResetPasswordModal;
