import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getDb } from "../../db";
import { ContactService } from "../../service/contact-service";
import { adminCors } from "../../lib/cors";
import {
    updateContactStatusSchema,
    contactMessageResponseSchema,
    contactMessagesResponseSchema,
} from "../../schema/contact-schema";
import { successResponseSchema, errorResponseSchema } from "../../schema/common-schema";

const contactRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

// CORS 中间件 - Admin 前端
contactRoute.use("/*", adminCors);

// 获取所有消息
const getAllContactsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["Admin - Contact"],
    summary: "获取所有联系消息",
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: contactMessagesResponseSchema,
                },
            },
            description: "获取成功",
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

contactRoute.openapi(getAllContactsRoute, async (c) => {
    const db = getDb(c.env);
    const service = new ContactService(db);

    try {
        const messages = await service.findAll();
        return c.json({
            success: true,
            data: messages,
        }, 200);
    } catch (error) {
        console.error("获取消息列表失败:", error);
        return c.json({
            success: false,
            message: "获取失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 更新消息状态
const updateContactStatusRoute = createRoute({
    method: "patch",
    path: "/:id/status",
    tags: ["Admin - Contact"],
    summary: "更新联系消息状态",
    request: {
        params: z.object({
            id: z.string(),
        }),
        body: {
            content: {
                "application/json": {
                    schema: updateContactStatusSchema,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: contactMessageResponseSchema,
                },
            },
            description: "更新成功",
        },
        404: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "消息不存在",
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

contactRoute.openapi(updateContactStatusRoute, async (c) => {
    const db = getDb(c.env);
    const service = new ContactService(db);
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const { status } = body;

    try {
        const updated = await service.updateStatus(id, status);
        if (!updated) {
            return c.json({
                success: false,
                message: "消息不存在",
            }, 404);
        }

        return c.json({
            success: true,
            data: updated,
        }, 200);
    } catch (error) {
        console.error("更新消息状态失败:", error);
        return c.json({
            success: false,
            message: "更新失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// 删除消息
const deleteContactRoute = createRoute({
    method: "delete",
    path: "/:id",
    tags: ["Admin - Contact"],
    summary: "删除联系消息",
    request: {
        params: z.object({
            id: z.string(),
        }),
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.literal(true),
                        message: z.string(),
                        data: z.any(),
                    }),
                },
            },
            description: "删除成功",
        },
        404: {
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
            description: "消息不存在",
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

contactRoute.openapi(deleteContactRoute, async (c) => {
    const db = getDb(c.env);
    const service = new ContactService(db);
    const id = c.req.param("id");

    try {
        const deleted = await service.delete(id);
        if (!deleted) {
            return c.json({
                success: false,
                message: "消息不存在",
            }, 404);
        }

        return c.json({
            success: true,
            message: "删除成功",
            data: deleted,
        }, 200);
    } catch (error) {
        console.error("删除消息失败:", error);
        return c.json({
            success: false,
            message: "删除失败",
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

export default contactRoute;
