import { Card, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { UserProfile } from '../../api/user';

interface ProfileCardProps {
  profile: UserProfile | null;
  children: React.ReactNode;
}

const ProfileCard = ({ profile, children }: ProfileCardProps) => {
  return (
    <Card style={{ maxWidth: 600 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Avatar size={80} src={profile?.image} icon={<UserOutlined />} />
        <h3 style={{ marginTop: 12, marginBottom: 0 }}>{profile?.name}</h3>
        <p style={{ color: '#999' }}>{profile?.email}</p>
      </div>
      {children}
    </Card>
  );
};

export default ProfileCard;
