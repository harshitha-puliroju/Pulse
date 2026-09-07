import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { GATE_PROVIDER_ID, gateIdentitySessions } from "./gate-session.server";
import { pgliteDialect } from "./pglite-dialect";
import { PREVIEW_ALLOWED_HOSTS } from "./preview";

void ensureDbReady();

const globalAuthRef = globalThis as typeof globalThis & {
  __grokAuthPreviewSecret__?: string;
};
function previewAuthSecret(): string {
  globalAuthRef.__grokAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__grokAuthPreviewSecret__;
}

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const authDisabled = env("VITE_AUTH_ENABLED") === "false";
export const authConfigured = !authDisabled;

const explicitBaseURL = env("BETTER_AUTH_URL");
const vercelHost = env("VERCEL_PROJECT_PRODUCTION_URL") ?? env("VERCEL_URL");
const vercelBaseURL = vercelHost ? `https://${vercelHost.replace(/^https?:\/\//, "")}` : undefined;
const configuredBaseURL = explicitBaseURL ?? vercelBaseURL;

const previewAllowedHosts: string[] = [...PREVIEW_ALLOWED_HOSTS];
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://192.168.50.77:8080",
  "http://[::1]:8080",
  "http://localhost:8083",
  "http://192.168.50.77:8083",
  "http://[::1]:8083",
];

const baseURL = configuredBaseURL ?? {
  allowedHosts: [...previewAllowedHosts, "localhost", "192.168.50.77", "[::1]"],
  protocol: "auto" as const,
  fallback: "http://localhost:8083",
};

const trustedOrigins: string[] = configuredBaseURL
  ? [configuredBaseURL, ...LOCAL_DEV_ORIGINS]
  : [
      ...previewAllowedHosts,
      ...previewAllowedHosts.flatMap((host) => [`https://${host}`, `http://${host}`]),
      ...LOCAL_DEV_ORIGINS,
    ];

const databaseUrl = env("DATABASE_URL");
const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";

export const auth = betterAuth({
  baseURL,
  secret: env("BETTER_AUTH_SECRET") ?? previewAuthSecret(),
  database,
  trustedOrigins,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: [GATE_PROVIDER_ID],
      requireLocalEmailVerified: false,
    },
  },
  session: { cookieCache: { enabled: true, maxAge: 300 } },
  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-grok-auth.session_data" },
      account_data: { name: "__Host-grok-auth.account_data" },
      dont_remember: { name: "__Host-grok-auth.dont_remember" },
    },
  },
  plugins: [
    gateIdentitySessions(),
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}
