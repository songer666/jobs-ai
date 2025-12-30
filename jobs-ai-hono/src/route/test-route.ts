import { OpenAPIHono } from "@hono/zod-openapi";
import { sql, eq } from "drizzle-orm";
import { getDb } from "../db";
import { user, account } from "../db/schema";
import { createAuth } from "../lib/auth";

const testRoute = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

// 创建数据库表
testRoute.get('/setup', async (c) => {
  const db = getDb(c.env);
  
  try {
    // 创建 user 表（包含 admin 插件字段）
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
        updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
        username TEXT UNIQUE,
        display_username TEXT,
        role TEXT DEFAULT 'user',
        banned INTEGER DEFAULT 0,
        ban_reason TEXT,
        ban_expires INTEGER
      )
    `);

    // 创建 session 表（包含 impersonatedBy 字段）
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
        updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        impersonated_by TEXT
      )
    `);
    await db.run(sql`CREATE INDEX IF NOT EXISTS session_userId_idx ON session(user_id)`);

    // 创建 account 表
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at INTEGER,
        refresh_token_expires_at INTEGER,
        scope TEXT,
        password TEXT,
        created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
        updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
      )
    `);
    await db.run(sql`CREATE INDEX IF NOT EXISTS account_userId_idx ON account(user_id)`);

    // 创建 verification 表
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
        updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
      )
    `);
    await db.run(sql`CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier)`);

    return c.json({ 
      success: true, 
      message: '所有表创建成功！',
      tables: ['user', 'session', 'account', 'verification']
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      message: '创建表失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 创建管理员账户
testRoute.get('/seed', async (c) => {
  const auth = createAuth(c.env);
  const db = getDb(c.env);

  const adminConfig = {
    username: 'admin',
    password: 'admin123',
    email: 'admin@examai.com',
    name: '管理员',
  };

  try {
    // 检查管理员是否已存在
    const existingUser = await db.select().from(user).where(eq(user.username, adminConfig.username));
    if (existingUser.length > 0) {
      return c.json({ 
        success: false, 
        message: '管理员账户已存在',
        admin: { username: adminConfig.username, email: adminConfig.email }
      });
    }

    // 使用 better-auth API 注册管理员
    await auth.api.signUpEmail({
      body: {
        password: adminConfig.password,
        email: adminConfig.email,
        name: adminConfig.name,
      },
    });

    // 使用 Drizzle ORM 设置用户名、角色和邮箱验证状态
    await db.update(user)
      .set({
        username: adminConfig.username,
        displayUsername: adminConfig.username,
        emailVerified: true,
        role: 'admin',
      })
      .where(eq(user.email, adminConfig.email));

    return c.json({ 
      success: true, 
      message: '管理员账户创建成功！',
      admin: {
        username: adminConfig.username,
        password: adminConfig.password,
        email: adminConfig.email,
        role: 'admin',
      },
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      message: '创建管理员失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default testRoute;
