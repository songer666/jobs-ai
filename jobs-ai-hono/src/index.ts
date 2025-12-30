import { createHonoApp } from "./lib/create-hono";
import { configureOpenAPI } from "./lib/open-api";
import authRoute from "./route/auth-route";
// import testRoute from "./route/test-route";
import adminUserRoute from "./route/admin/user-route";
import adminContactRoute from "./route/admin/contact-route";
import adminInterviewRoute from "./route/admin/interview-route";
import adminResumeRoute from "./route/admin/resume-route";
import adminQuestionRoute from "./route/admin/question-route";
import adminResumeAnalysisRoute from "./route/admin/resume-analysis-route";
import adminDashboardRoute from "./route/admin/dashboard-route";
import profileRoute from "./route/user/profile-route";
import jobInfoRoute from "./route/user/job-info-route";
import interviewRoute from "./route/user/interview-route";
import questionRoute from "./route/user/question-route";
import resumeGeneratorRoute from "./route/user/resume-generator-route";
import resumeAnalyzerRoute from "./route/user/resume-analyzer-route";
import dashboardRoute from "./route/user/dashboard-route";
import userContactRoute from "./route/user/contact-route";
import { webhookRoute } from "./route/webhook";

const app = createHonoApp().basePath("/api");

// Test 路由（创建表、创建管理员等）
app.route('/auth', authRoute)
  .route('/admin/dashboard', adminDashboardRoute)
  .route('/admin/user', adminUserRoute)
  .route('/admin/contact', adminContactRoute)
  .route('/admin/interview', adminInterviewRoute)
  .route('/admin/resume', adminResumeRoute)
  .route('/admin/question', adminQuestionRoute)
  .route('/admin/resume-analysis', adminResumeAnalysisRoute)
  .route('/user/profile', profileRoute)
  .route('/user/job-info', jobInfoRoute)
  .route('/user/interview', interviewRoute)
  .route('/user/question', questionRoute)
  .route('/user/resume-generator', resumeGeneratorRoute)
  .route('/user/resume-analyzer', resumeAnalyzerRoute)
  .route('/user/dashboard', dashboardRoute)
  .route('/user/contact', userContactRoute)
  .route('/webhook', webhookRoute);
  // .route('/test', testRoute);

configureOpenAPI(app);

export default app
