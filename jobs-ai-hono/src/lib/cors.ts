import { env } from "cloudflare:workers";
import { cors } from "hono/cors";

export const nextCors = cors({
  origin: env.CORS_ORIGIN,
  allowHeaders: ["Content-Type", "Authorization", "Cookie"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
});

export const adminCors = cors({
  origin: env.CORS_ORIGIN_ADMIN,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
});
