import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { nextCors } from "../../lib/cors";
import { authMiddleware } from "../../lib/auth-middleware";
import { JobInfoService } from "../../service/job-info-service";
import { getDb } from "../../db";
import {
  createJobInfoRequestSchema,
  updateJobInfoRequestSchema,
  jobInfoResponseSchema,
  jobInfoListResponseSchema,
  errorResponseSchema,
} from "../../schema/job-info-schema";

type Variables = {
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
    [key: string]: unknown;
  };
};

const jobInfoRoute = new OpenAPIHono<{ Bindings: CloudflareBindings; Variables: Variables }>();

// CORS 中间件
jobInfoRoute.use("/*", nextCors);

// 获取我的职位信息列表（可选包含公开的）
const getMyJobInfosRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["User - JobInfo"],
  summary: "获取我的职位信息列表（可选包含公开的）",
  request: {
    query: z.object({
      includePublic: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: jobInfoListResponseSchema } },
      description: "获取成功",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未登录",
    },
  },
});

jobInfoRoute.use(getMyJobInfosRoute.getRoutingPath(), authMiddleware);
jobInfoRoute.openapi(getMyJobInfosRoute, async (c) => {
  const db = getDb(c.env);
  const service = new JobInfoService(db);
  const user = c.get("user");
  const { includePublic } = c.req.valid("query");

  const jobInfos = includePublic === "true" 
    ? await service.findByUserIdWithPublic(user.id)
    : await service.findByUserIdOnly(user.id);
  const formattedJobInfos = jobInfos.map(job => ({
    ...job,
    createdAt: job.createdAt.getTime(),
    updatedAt: job.updatedAt.getTime(),
    isOwner: job.userId === user.id,
  }));
  return c.json({ success: true, jobInfos: formattedJobInfos }, 200);
});

// 获取单个职位信息
const getJobInfoRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["User - JobInfo"],
  summary: "获取单个职位信息",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: jobInfoResponseSchema } },
      description: "获取成功",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未登录",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "无权访问",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未找到",
    },
  },
});

jobInfoRoute.use(getJobInfoRoute.getRoutingPath(), authMiddleware);
jobInfoRoute.openapi(getJobInfoRoute, async (c) => {
  const db = getDb(c.env);
  const service = new JobInfoService(db);
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const canAccess = await service.canUserAccess(id, user.id);
  if (!canAccess) {
    const jobInfo = await service.findById(id);
    if (!jobInfo) {
      return c.json({ success: false, message: "职位信息不存在" }, 404);
    }
    return c.json({ success: false, message: "无权访问此职位信息" }, 403);
  }

  const jobInfo = await service.findById(id);
  const formattedJobInfo = jobInfo ? {
    ...jobInfo,
    createdAt: jobInfo.createdAt.getTime(),
    updatedAt: jobInfo.updatedAt.getTime(),
  } : undefined;
  return c.json({ success: true, jobInfo: formattedJobInfo }, 200);
});

// 创建职位信息
const createJobInfoRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["User - JobInfo"],
  summary: "创建职位信息",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createJobInfoRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: jobInfoResponseSchema } },
      description: "创建成功",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未登录",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "创建失败",
    },
  },
});

jobInfoRoute.use(createJobInfoRoute.getRoutingPath(), authMiddleware);
jobInfoRoute.openapi(createJobInfoRoute, async (c) => {
  const db = getDb(c.env);
  const service = new JobInfoService(db);
  const user = c.get("user");
  const body = c.req.valid("json");

  try {
    const jobInfo = await service.create({
      ...body,
      userId: user.id,
      isPublic: body.isPublic ?? false,
    });
    const formattedJobInfo = {
      ...jobInfo,
      createdAt: jobInfo.createdAt.getTime(),
      updatedAt: jobInfo.updatedAt.getTime(),
    };
    return c.json({ success: true, jobInfo: formattedJobInfo, message: "创建成功" }, 201);
  } catch (error) {
    return c.json({
      success: false,
      message: "创建失败",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// 更新职位信息
const updateJobInfoRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["User - JobInfo"],
  summary: "更新职位信息",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateJobInfoRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: jobInfoResponseSchema } },
      description: "更新成功",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未登录",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "无权修改",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未找到",
    },
  },
});

jobInfoRoute.use(updateJobInfoRoute.getRoutingPath(), authMiddleware);
jobInfoRoute.openapi(updateJobInfoRoute, async (c) => {
  const db = getDb(c.env);
  const service = new JobInfoService(db);
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const canModify = await service.canUserModify(id, user.id);
  if (!canModify) {
    const jobInfo = await service.findById(id);
    if (!jobInfo) {
      return c.json({ success: false, message: "职位信息不存在" }, 404);
    }
    return c.json({ success: false, message: "无权修改此职位信息" }, 403);
  }

  const jobInfo = await service.update(id, body);
  const formattedJobInfo = jobInfo ? {
    ...jobInfo,
    createdAt: jobInfo.createdAt.getTime(),
    updatedAt: jobInfo.updatedAt.getTime(),
  } : undefined;
  return c.json({ success: true, jobInfo: formattedJobInfo, message: "更新成功" }, 200);
});

// 删除职位信息
const deleteJobInfoRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["User - JobInfo"],
  summary: "删除职位信息",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: jobInfoResponseSchema } },
      description: "删除成功",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未登录",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "无权删除",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "未找到",
    },
  },
});

jobInfoRoute.use(deleteJobInfoRoute.getRoutingPath(), authMiddleware);
jobInfoRoute.openapi(deleteJobInfoRoute, async (c) => {
  const db = getDb(c.env);
  const service = new JobInfoService(db);
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const canModify = await service.canUserModify(id, user.id);
  if (!canModify) {
    const jobInfo = await service.findById(id);
    if (!jobInfo) {
      return c.json({ success: false, message: "职位信息不存在" }, 404);
    }
    return c.json({ success: false, message: "无权删除此职位信息" }, 403);
  }

  const jobInfo = await service.delete(id);
  const formattedJobInfo = jobInfo ? {
    ...jobInfo,
    createdAt: jobInfo.createdAt.getTime(),
    updatedAt: jobInfo.updatedAt.getTime(),
  } : undefined;
  return c.json({ success: true, jobInfo: formattedJobInfo, message: "删除成功" }, 200);
});

export default jobInfoRoute;
