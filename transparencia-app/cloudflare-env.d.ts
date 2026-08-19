export {};

declare global {
  interface CloudflareEnv {
    PUBLIC_DATA?: R2Bucket;
    DB?: D1Database;
    EXPENSIVE_API_RATE_LIMITER?: RateLimit;
  }
}
