export const isProduction = process.env.NODE_ENV === "production";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getGoogleCallbackUrl(): string {
  const value = isProduction
    ? process.env.GOOGLE_CALLBACK_URL_PRODUCTION
    : process.env.GOOGLE_CALLBACK_URL;

  if (!value) {
    throw new Error("Google OAuth callback URL is not configured.");
  }

  const url = new URL(value);

  if (isProduction && url.protocol !== "https:") {
    throw new Error("Production Google callback URL must use HTTPS.");
  }

  return url.toString();
}
