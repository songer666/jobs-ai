import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, username, admin } from "better-auth/plugins";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { env } from "cloudflare:workers";
import { createResend, sendOTPEmail } from "./resend";

// 静态 auth 实例供 CLI 使用（仅用于类型推断和 schema 生成）
// export const auth = betterAuth({
//     database: drizzleAdapter(getDb(env),{
//         provider: 'sqlite',
//         schema,
//     }),
//     basePath: "/api/auth",
//     secret: env.BETTER_AUTH_SECRET,
//     emailAndPassword: {
//         enabled: true,
//         autoSignIn: true,
//     },
//     plugins: [
//         username(),
//         admin({
//             defaultRole: "user",
//             adminRoles: ["admin"],
//         }),
//         emailOTP({
//             async sendVerificationOTP() {},
//             expiresIn: 300,
//             otpLength: 6,
//         }),
//     ],
// });

// 在请求处理函数中创建 auth 实例
export function createAuth(env: CloudflareBindings) {
    const db = getDb(env);

    return betterAuth({
        baseURL: env.BETTER_AUTH_URL,
        database: drizzleAdapter(db, {
            provider: "sqlite",
            schema,
        }),
        basePath: "/api/auth",
        secret: env.BETTER_AUTH_SECRET,
        emailAndPassword: {
            enabled: true,
            autoSignIn: true,
        },
        user: {
            additionalFields: {
                role: {
                    type: "string",
                    defaultValue: "user",
                    input: false,
                },
                banned: {
                    type: "boolean",
                    defaultValue: false,
                    input: false,
                },
                banReason: {
                    type: "string",
                    input: false,
                },
                banExpires: {
                    type: "number",
                    input: false,
                },
            },
        },
        session: {
            cookieCache: {
                enabled: false, // 禁用 cookie cache，避免超出大小限制
            },
        },
        trustedOrigins: [env.CORS_ORIGIN, env.CORS_ORIGIN_ADMIN].filter(Boolean),
        advanced: {
            cookiePrefix: "better-auth",
            useSecureCookies: true, // 生产环境使用 HTTPS，必须为 true
            crossSubDomainCookies: {
                enabled: false,
            },
            defaultCookieAttributes: {
                sameSite: "none", // 跨域请求需要 none
                secure: true, // 生产环境使用 HTTPS
                path: "/",
            },
        },
        socialProviders: {
            github: {
                clientId: env.GITHUB_CLIENT_ID || "",
                clientSecret: env.GITHUB_CLIENT_SECRET || "",
            },
        },
        plugins: [
            username(),
            admin({
                defaultRole: "user",
                adminRoles: ["admin"],
            }),
            emailOTP({
                sendVerificationOnSignUp: true,
                async sendVerificationOTP({ email, otp, type }) {
                    try {
                        const resend = createResend(env.RESEND_API_KEY);
                        const result = await sendOTPEmail(resend, {
                            to: email,
                            code: otp,
                            type: type as 'email-verification' | 'forget-password' | 'sign-in',
                            appName: "Jobs AI",
                            expiresInMinutes: 5,
                        });
                        // 检查 Resend 返回的错误
                        if (result.error) {
                            throw new Error("邮件发送失败，请稍后重试");
                        }
                    } catch (error) {
                        throw error;
                    }
                },
                expiresIn: 300,
                otpLength: 6,
                disableSignUp: false,
            }),
        ],
    });
}