// src/lib/open-api.ts
import type { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";

/**
 * OpenAPI 文档配置
 */
export const openApiConfig = {
    openapi: "3.1.0" as const,
    info: {
        title: "Hono Learn API",
        version: "1.0.0",
        description: "Hono学习API",
    },
};

/**
 * Scalar 主题配置
 */
export const scalarConfig = {
    theme: "saturn" as const,
};

/**
 * 配置 OpenAPI 文档和 Scalar UI
 * @param app OpenAPIHono 实例
 * @param docPath 文档路径 (默认 /api/doc)
 * @param uiPath UI 路径 (默认 /api/reference)
 */export function configureOpenAPI<T extends OpenAPIHono<{Bindings: CloudflareBindings}>>(
    app: T,
    docPath = "/doc",
    uiPath = "/reference"
) {
    // OpenAPI JSON 文档
    app.doc(docPath, openApiConfig);

    // Scalar API Reference UI
    app.get(
        uiPath,
        Scalar({
            url: `/api${docPath}`,
            ...scalarConfig,
        })
    );

    return app;
}
