// প্রোডাকশন মোড কিনা তা এক জায়গা থেকে জানা যায়
export const isProduction = process.env.NODE_ENV === "production";

// প্রয়োজনীয় env না থাকলে স্পষ্ট এরর দেয়
export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

// পরিবেশ অনুযায়ী Google callback URL বেছে নেয় (dev / production আলাদা)
export function getGoogleCallbackUrl(): string {
  const value = isProduction
    ? process.env.GOOGLE_CALLBACK_URL_PRODUCTION
    : process.env.GOOGLE_CALLBACK_URL;

  if (!value) {
    throw new Error("Google OAuth callback URL is not configured.");
  }

  const url = new URL(value);

  // প্রোডাকশনে callback অবশ্যই HTTPS হতে হবে
  if (isProduction && url.protocol !== "https:") {
    throw new Error("Production Google callback URL must use HTTPS.");
  }

  return url.toString();
}
