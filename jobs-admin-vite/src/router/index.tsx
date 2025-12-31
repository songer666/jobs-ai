import { createHashRouter } from 'react-router-dom';
import { lazy } from 'react';
import { LazyLoad } from '../components/LazyLoad';
import { AuthGuard } from '../components/AuthGuard';

const BasicLayout = lazy(() => import('../layout/BasicLayout'));
const LoginPage = lazy(() => import('../pages/login'));
const DashboardPage = lazy(() => import('../pages/dashboard'));
const AdminUsersPage = lazy(() => import('../pages/users/admins'));
const NormalUsersPage = lazy(() => import('../pages/users/normal'));
const ContactListPage = lazy(() => import('../pages/contact/list'));
const InterviewListPage = lazy(() => import('../pages/interview/list'));
const ResumeListPage = lazy(() => import('../pages/resume/list'));
const QuestionListPage = lazy(() => import('../pages/question/list'));

const router = createHashRouter([
  {
    path: '/login',
    element: (
      <AuthGuard requireAuth={false}>
        <LazyLoad><LoginPage /></LazyLoad>
      </AuthGuard>
    ),
  },
  {
    path: '/',
    element: (
      <AuthGuard requireAuth={true}>
        <LazyLoad><BasicLayout /></LazyLoad>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <LazyLoad><DashboardPage /></LazyLoad>,
      },
      {
        path: 'dashboard',
        element: <LazyLoad><DashboardPage /></LazyLoad>,
      },
      {
        path: 'users/admins',
        element: <LazyLoad><AdminUsersPage /></LazyLoad>,
      },
      {
        path: 'users/normal',
        element: <LazyLoad><NormalUsersPage /></LazyLoad>,
      },
      {
        path: 'contact/list',
        element: <LazyLoad><ContactListPage /></LazyLoad>,
      },
      {
        path: 'interview/list',
        element: <LazyLoad><InterviewListPage /></LazyLoad>,
      },
      {
        path: 'resume/list',
        element: <LazyLoad><ResumeListPage /></LazyLoad>,
      },
      {
        path: 'question/list',
        element: <LazyLoad><QuestionListPage /></LazyLoad>,
      },
    ],
  },
]);

export default router;
