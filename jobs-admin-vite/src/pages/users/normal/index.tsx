import UserManagement from '../../../components/UserManagement';

const NormalUsersPage = () => {
  return (
    <UserManagement
      title="普通用户"
      subTitle="管理系统普通用户"
      userRole="user"
    />
  );
};

export default NormalUsersPage;
