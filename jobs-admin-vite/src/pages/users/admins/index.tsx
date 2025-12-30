import UserManagement from '../../../components/UserManagement';

const AdminUsersPage = () => {
  return (
    <UserManagement
      title="管理员用户"
      subTitle="管理系统管理员账户"
      userRole="admin"
    />
  );
};

export default AdminUsersPage;
