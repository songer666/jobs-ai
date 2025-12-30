import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { adminCors } from "../../lib/cors";
import { createUserService } from "../../service/user-service";
import { getDb } from "../../db";
import {
  userIdParamSchema,
  sessionIdParamSchema,
  verifyEmailRequestSchema,
  updateProfileRequestSchema,
  successResponseSchema,
  errorResponseSchema,
  getUserResponseSchema,
  updateUserResponseSchema,
  getSessionsResponseSchema,
  getAllSessionsResponseSchema,
} from "../../schema/user-schema";
import { userStatsResponseSchema } from "../../schema/admin/user-stats-schema";

const userRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

// CORS 中间件
userRoute.use("/*", adminCors);

// 修改用户邮箱验证状态
const verifyEmailRoute = createRoute({
  method: "post",
  path: "/verify-email",
  tags: ["Admin - User"],
  summary: "修改用户邮箱验证状态",
  request: {
    body: {
      content: {
        "application/json": {
          schema: verifyEmailRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "操作成功",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "操作失败",
    },
  },
});

userRoute.openapi(verifyEmailRoute, async (c) => {
  const userService = createUserService(c.env);
  const { userId, verified } = c.req.valid("json");

  try {
    const result = await userService.updateEmailVerified(userId, verified);
    return c.json(result, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "操作失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// 获取用户的所有会话
const getUserSessionsRoute = createRoute({
  method: "get",
  path: "/sessions/{userId}",
  tags: ["Admin - User"],
  summary: "获取用户的所有会话",
  request: {
    params: userIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: getSessionsResponseSchema } },
      description: "获取成功",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "获取失败",
    },
  },
});

userRoute.openapi(getUserSessionsRoute, async (c) => {
  const userService = createUserService(c.env);
  const { userId } = c.req.valid("param");

  try {
    const sessions = await userService.getUserSessions(userId);
    return c.json({ success: true, sessions }, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "获取会话失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// 获取所有会话
const getAllSessionsRoute = createRoute({
  method: "get",
  path: "/sessions",
  tags: ["Admin - User"],
  summary: "获取所有会话",
  responses: {
    200: {
      content: { "application/json": { schema: getAllSessionsResponseSchema } },
      description: "获取成功",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "获取失败",
    },
  },
});

userRoute.openapi(getAllSessionsRoute, async (c) => {
  const userService = createUserService(c.env);

  try {
    const sessions = await userService.getAllSessions();
    return c.json({ success: true, sessions }, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "获取会话失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// 删除指定会话
const deleteSessionRoute = createRoute({
  method: "delete",
  path: "/sessions/{sessionId}",
  tags: ["Admin - User"],
  summary: "删除指定会话",
  request: {
    params: sessionIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "删除成功",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "删除失败",
    },
  },
});

userRoute.openapi(deleteSessionRoute, async (c) => {
  const userService = createUserService(c.env);
  const { sessionId } = c.req.valid("param");

  try {
    const result = await userService.deleteSession(sessionId);
    return c.json(result, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "删除会话失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// 删除用户的所有会话
const deleteUserSessionsRoute = createRoute({
  method: "delete",
  path: "/sessions/user/{userId}",
  tags: ["Admin - User"],
  summary: "删除用户的所有会话",
  request: {
    params: userIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "删除成功",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "删除失败",
    },
  },
});

userRoute.openapi(deleteUserSessionsRoute, async (c) => {
  const userService = createUserService(c.env);
  const { userId } = c.req.valid("param");

  try {
    const result = await userService.deleteUserSessions(userId);
    return c.json(result, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "删除会话失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// 获取用户信息
const getProfileRoute = createRoute({
  method: "get",
  path: "/profile/{userId}",
  tags: ["Admin - User"],
  summary: "获取用户信息",
  request: {
    params: userIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: getUserResponseSchema } },
      description: "获取成功",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "用户不存在",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "获取失败",
    },
  },
});

userRoute.openapi(getProfileRoute, async (c) => {
  const userService = createUserService(c.env);
  const { userId } = c.req.valid("param");

  try {
    const userData = await userService.getUserById(userId);
    if (!userData) {
      return c.json({ success: false, message: "用户不存在" }, 404);
    }
    return c.json({ success: true, user: userData }, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "获取用户信息失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// 更新用户信息
const updateProfileRoute = createRoute({
  method: "put",
  path: "/profile/{userId}",
  tags: ["Admin - User"],
  summary: "更新用户信息",
  request: {
    params: userIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateProfileRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: updateUserResponseSchema } },
      description: "更新成功",
    },
    400: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "请求参数错误",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "更新失败",
    },
  },
});

userRoute.openapi(updateProfileRoute, async (c) => {
  const userService = createUserService(c.env);
  const { userId } = c.req.valid("param");
  const body = c.req.valid("json");

  try {
    const result = await userService.updateProfile(userId, body);
    if (!result.success || !result.user) {
      return c.json({ success: false, message: result.message }, 400);
    }
    return c.json({ success: true, message: result.message, user: result.user }, 200);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    let message = "更新失败";
    if (errorMsg.includes("UNIQUE constraint failed: user.email")) {
      message = "该邮箱已被其他用户使用";
    } else if (errorMsg.includes("UNIQUE constraint failed: user.username")) {
      message = "该用户名已被其他用户使用";
    }
    return c.json({
      success: false,
      message,
      error: errorMsg,
    }, 500);
  }
});

// 获取用户统计数据
const getUserStatsRoute = createRoute({
  method: "get",
  path: "/stats/overview",
  tags: ["Admin - User"],
  summary: "获取用户统计数据",
  responses: {
    200: {
      content: { "application/json": { schema: userStatsResponseSchema } },
      description: "获取成功",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "服务器错误",
    },
  },
});

userRoute.openapi(getUserStatsRoute, async (c) => {
  const db = getDb(c.env);

  try {
    const allUsers = await db.query.user.findMany();
    
    const stats = {
      totalUsers: allUsers.length,
      normalUsers: allUsers.filter(u => u.role === 'user').length,
      adminUsers: allUsers.filter(u => u.role === 'admin').length,
    };

    return c.json({
      success: true,
      stats,
    }, 200);
  } catch (error) {
    console.error("获取用户统计失败:", error);
    return c.json({
      success: false as const,
      message: "获取用户统计失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

export default userRoute;
