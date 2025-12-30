import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { getDb } from "../../db";
import { ContactService } from "../../service/contact-service";
import { nextCors } from "../../lib/cors";
import {
    createContactMessageSchema,
    createContactSuccessSchema,
} from "../../schema/contact-schema";
import { errorResponseSchema } from "../../schema/common-schema";
import { formatIpAddress } from "../../lib/ip-util";

const contactRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

// CORS 中间件 - Next.js 前端
contactRoute.use("/*", nextCors);

// 创建联系消息路由
const createContactRoute = createRoute({
    method: "post",
    path: "/",
    tags: ["Contact"],
    summary: "创建联系消息",
    description: "限流规则：同一 IP 在 半 小时内只能发送一次消息",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createContactMessageSchema,
                },
            },
        },
    },
    responses: {
        201: {
            content: {
                "application/json": {
                    schema: createContactSuccessSchema,
                },
            },
            description: "消息发送成功",
        },
        429: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "请求过于频繁",
        },
        500: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "服务器错误",
        },
    },
});

contactRoute.openapi(createContactRoute, async (c) => {
        const db = getDb(c.env);
        const service = new ContactService(db);
        const body = c.req.valid("json");

        // 获取客户端 IP 和 User-Agent
        let ip = c.req.header('x-forwarded-for')?.split(',')[0] || 
                 c.req.header('cf-connecting-ip') ||  
                 c.req.header("x-real-ip") || 
                 "unknown";
        const userAgent = c.req.header("user-agent") || "unknown";
        ip = formatIpAddress(ip);

        try {
            // 检查限流：1小时内只能发送一次
            const canSend = await service.checkRateLimit(ip, 30 * 60 * 1000);
            
            if (!canSend) {
                return c.json({
                    success: false,
                    message: "您在1小时内已经发送过消息，请稍后再试",
                }, 429);
            }

            // 创建消息
            const message = await service.create({
                name: body.name,
                email: body.email,
                subject: body.subject,
                message: body.message,
                ip,
                userAgent,
            });

            return c.json({
                success: true,
                message: "消息发送成功，我们会尽快回复您",
                data: {
                    id: message.id,
                    createdAt: message.createdAt,
                },
            }, 201);
        } catch (error) {
            console.error("创建联系消息失败:", error);
            return c.json({
                success: false,
                message: "发送失败，请稍后重试",
                error: error instanceof Error ? error.message : String(error),
            }, 500);
        }
});

export default contactRoute;
