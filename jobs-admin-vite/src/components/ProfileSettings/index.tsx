import { PageContainer } from '@ant-design/pro-components';
import { Spin } from 'antd';
import { useSessionCache } from '../../lib/session-provider';
import { useEffect, useState } from 'react';
import { userApi, type UserProfile } from '../../api/user';
import ProfileCard from './ProfileCard';
import ProfileForm from './ProfileForm';

export type { UserProfile };

const ProfileSettings = () => {
  const { session } = useSessionCache();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const fetchProfile = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const data = await userApi.getProfile(session.user.id);
      if (data.success) {
        setProfile(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: '个人设置',
        subTitle: '管理您的账户信息',
      }}
    >
      <ProfileCard profile={profile}>
        <ProfileForm
          profile={profile}
          userId={session?.user?.id || ''}
          onSuccess={(updatedProfile: UserProfile) => setProfile(updatedProfile)}
        />
      </ProfileCard>
    </PageContainer>
  );
};

export default ProfileSettings;
