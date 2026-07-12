import { z, ZodSchema } from "zod";
import { ValidationError } from "./errors";

/**
 * Parse and validate an incoming payload using a Zod schema.
 * Throws a ValidationError with details if validation fails.
 */
export function parseBody<T>(schema: ZodSchema<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    // Collect a friendly error map for the API response.
    const issues = result.error.format();
    throw new ValidationError("Invalid request payload", { issues });
  }
  return result.data;
}

/**
 * Helper for query parameters – converts string values to appropriate types
 * before validation (e.g., numbers, booleans). Use when `req.query` is an object
 * of strings (Next.js default).
 */
export function parseQuery<T>(schema: ZodSchema<T>, raw: Record<string, string | string[]>): T {
  // Convert every value to string (take first element if array) for Zod to handle.
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }
  return parseBody(schema, normalized);
}
