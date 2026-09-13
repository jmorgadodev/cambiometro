export {};

declare global {
  interface CloudflareEnv {
    PUBLIC_DATA?: R2Bucket;
    DB?: D1Database;
    TRANSFERS_DB?: D1Database;
    EXPENSIVE_API_RATE_LIMITER?: RateLimit;
    TURNSTILE_SECRET_KEY?: string;
    NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
    NEXT_PUBLIC_GA4_ID?: string;
    CSP_REPORT_ONLY?: string;
  }
}
