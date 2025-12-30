import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { nextCors } from "../../lib/cors";
import { authMiddleware } from "../../lib/auth-middleware";
import { createProfileService } from "../../service/profile-service";
import {
  updateProfileRequestSchema,
  errorResponseSchema,
  getProfileResponseSchema,
  updateProfileResponseSchema,
} from "../../schema/profile-schema";

type Variables = {
  user: {
    id: string;
    email: string;
    name: string;
    [key: string]: unknown;
  };
};

const profileRoute = new OpenAPIHono<{ Bindings: CloudflareBindings; Variables: Variables }>();

// CORS 中间件
profileRoute.use("/*", nextCors);

// 获取当前用户的职业信息
const getMyProfileRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["User - Profile"],
  summary: "获取当前用户的职业信息",
  responses: {
    200: {
      content: { "application/json": { schema: getProfileResponseSchema } },
      description: "获取成功",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未登录",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "获取失败",
    },
  },
});

profileRoute.use(getMyProfileRoute.getRoutingPath(), authMiddleware);
profileRoute.openapi(getMyProfileRoute, async (c) => {
  const profileService = createProfileService(c.env);
  const user = c.get("user");

  try {
    const profile = await profileService.getProfileByUserId(user.id);
    return c.json({ success: true, profile }, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "获取职业信息失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// 更新当前用户的职业信息
const updateMyProfileRoute = createRoute({
  method: "put",
  path: "/me",
  tags: ["User - Profile"],
  summary: "更新当前用户的职业信息",
  request: {
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
      content: { "application/json": { schema: updateProfileResponseSchema } },
      description: "更新成功",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未登录",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "更新失败",
    },
  },
});

profileRoute.use(updateMyProfileRoute.getRoutingPath(), authMiddleware);
profileRoute.openapi(updateMyProfileRoute, async (c) => {
  const profileService = createProfileService(c.env);
  const user = c.get("user");
  const body = c.req.valid("json");

  try {
    const result = await profileService.upsertProfile(user.id, body);
    if (!result.profile) {
      return c.json({ success: false, message: result.message }, 500);
    }
    return c.json({ success: true, message: result.message, profile: result.profile }, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: "更新职业信息失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

export default profileRoute;
