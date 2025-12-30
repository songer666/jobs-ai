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
