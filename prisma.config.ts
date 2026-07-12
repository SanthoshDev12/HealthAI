import { defineConfig } from "prisma/config";

/**
 * Prisma 7+ configuration.
 * The datasource connection string is read from the environment (DATABASE_URL).
 * The driver adapter itself is supplied to the PrismaClient constructor in
 * `src/lib/prisma.ts` (required for serverless / Supabase Postgres).
 */
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
