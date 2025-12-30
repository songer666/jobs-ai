import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";

// 动态 CORS 中间件 - 在请求时获取环境变量
export const nextCors: MiddlewareHandler<{ Bindings: CloudflareBindings }> = async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });
  return corsMiddleware(c, next);
};

export const adminCors: MiddlewareHandler<{ Bindings: CloudflareBindings }> = async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN_ADMIN,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  });
  return corsMiddleware(c, next);
};
