import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { createAuth } from "../lib/auth";

const authRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

// CORS 中间件，支持多个 origin
authRoute.use("/*", async (c, next) => {
  const allowedOrigins = [
    c.env.CORS_ORIGIN,
    c.env.CORS_ORIGIN_ADMIN,
  ];
  
  // 如果环境变量有配置，添加到允许列表
  // if (c.env.CORS_ORIGIN) {
  //   allowedOrigins.push(...c.env.CORS_ORIGIN.split(",").map((o: string) => o.trim()));
  // }

  const corsMiddleware = cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return origin || allowedOrigins[0];
      }
      return null;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  });
  
  return corsMiddleware(c, next);
});

// 直接调用 better-auth API 发送 OTP（调试用）
// authRoute.post("/send-otp-api", async (c) => {
//   const { email, type } = await c.req.json();
//   console.log("[send-otp-api] email:", email, "type:", type);
//   try {
//     const auth = createAuth(c.env);
//     // 直接调用 better-auth 的 API
//     const result = await auth.api.sendVerificationOTP({
//       body: { email, type: type || "email-verification" },
//     });
//     console.log("[send-otp-api] result:", result);
//     return c.json({ success: true, result });
//   } catch (error) {
//     console.error("[send-otp-api] error:", error);
//     return c.json({ error: String(error) }, 500);
//   }
// });

// 检查用户是否存在
authRoute.post("/check-user", async (c) => {
  const { email } = await c.req.json();
  
  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }
  
  const auth = createAuth(c.env);
  const ctx = await auth.api.getSession({ headers: c.req.raw.headers });
  
  // 使用 better-auth 的内部方法检查用户
  try {
    const { getDb } = await import("../db");
    const db = getDb(c.env);
    const { user } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");
    
    const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1);
    
    return c.json({ 
      exists: existingUser.length > 0,
      message: existingUser.length > 0 ? "用户已存在" : "用户不存在"
    });
  } catch (error) {
    console.error("[Auth] Check user error:", error);
    return c.json({ error: "检查用户失败" }, 500);
  }
});

authRoute.all("/*", async (c) => {
  const url = new URL(c.req.url);
  
  // 打印错误页面的查询参数
  if (url.pathname.includes("/error")) {
    console.log("[Auth Error] Query params:", Object.fromEntries(url.searchParams));
  }
  
  const auth = createAuth(c.env);
  const response = await auth.handler(c.req.raw);
  
  // 获取请求的 origin
  const origin = c.req.header("origin");
  const allowedOrigins = [c.env.CORS_ORIGIN, c.env.CORS_ORIGIN_ADMIN];
  
  // 如果 origin 在允许列表中，添加 CORS 头
  if (origin && allowedOrigins.includes(origin)) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", origin);
    newHeaders.set("Access-Control-Allow-Credentials", "true");
    newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
  
  return response;
});

export default authRoute;
