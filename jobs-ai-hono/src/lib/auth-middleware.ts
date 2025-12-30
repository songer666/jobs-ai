import { createAuth } from "./auth";

/**
 * 用户认证中间件
 * 
 * 从 session cookie 获取用户信息
 * 如果未登录，返回 401 错误
 * 如果已登录，将用户信息存储到 context 中
 */
export const authMiddleware = async (c: any, next: () => Promise<void>) => {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session?.user) {
        return c.json({ success: false, message: "未登录" }, 401);
    }

    c.set("user", session.user);
    await next();
};

/**
 * Admin 认证中间件
 * 
 * 验证用户是否已登录且为管理员
 * 如果未登录，返回 401 错误
 * 如果不是管理员，返回 403 错误
 */
export const adminAuthMiddleware = async (c: any, next: () => Promise<void>) => {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session?.user) {
        return c.json({ success: false, message: "未登录" }, 401);
    }

    // 检查用户是否为管理员
    if (session.user.role !== "admin") {
        return c.json({ success: false, message: "无权限访问" }, 403);
    }

    c.set("user", session.user);
    await next();
};
