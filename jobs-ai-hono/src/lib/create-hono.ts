import {prettyJSON} from "hono/pretty-json";
import {notFound, onError, serveEmojiFavicon} from "stoker/middlewares";
import {OpenAPIHono} from "@hono/zod-openapi";

/**
 * 创建 Hono 应用实例
 */
export function createHonoApp() {
    const app = new OpenAPIHono<{Bindings: CloudflareBindings}>();

    app
        .use(prettyJSON())
        .use(serveEmojiFavicon("🔥"));

    app.notFound(notFound);
    app.onError(onError);

    return app;
}