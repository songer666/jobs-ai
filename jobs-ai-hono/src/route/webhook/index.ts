import { Hono } from "hono";
import { qstashRoute } from "./qstash-route";

export const webhookRoute = new Hono<{ Bindings: CloudflareBindings }>();

webhookRoute.route("/qstash", qstashRoute);
