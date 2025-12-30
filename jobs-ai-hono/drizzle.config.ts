import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: '33e6ecf5-9113-4744-b796-ae9c93a8118c',
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});


