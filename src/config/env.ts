/**
 * Centralised, validated environment configuration.
 * Reads from process.env and throws at boot if any required value is missing.
 * All access to environment variables MUST go through this module.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: optional("NODE_ENV", "development") === "production",
  isDev: optional("NODE_ENV", "development") === "development",

  appUrl: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // Database
  databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),

  // Supabase
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY", ""),

  // Auth / JWT
  jwtSecret: required("JWT_SECRET", process.env.JWT_SECRET),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET),
  jwtAccessTtlSeconds: Number(optional("JWT_ACCESS_TTL_SECONDS", "900")),
  jwtRefreshTtlSeconds: Number(optional("JWT_REFRESH_TTL_SECONDS", "1209600")),

  // 2FA
  twoFaEncryptionKey: required("TWOFA_ENCRYPTION_KEY", process.env.TWOFA_ENCRYPTION_KEY),

  // AI providers
  googleGeminiApiKey: optional("GOOGLE_GEMINI_API_KEY", ""),
  ollamaBaseUrl: optional("OLLAMA_BASE_URL", "http://localhost:11434"),
  ollamaModel: optional("OLLAMA_MODEL", "llama3:8b"),

  // Redis (Upstash)
  upstashRedisRestUrl: optional("UPSTASH_REDIS_REST_URL", ""),
  upstashRedisRestToken: optional("UPSTASH_REDIS_REST_TOKEN", ""),

  // Rate limits
  aiDailyLimitPerUser: Number(optional("AI_DAILY_LIMIT_PER_USER", "500")),

  // CORS
  allowedOrigins: optional("ALLOWED_ORIGINS", "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;
