// .env থেকে আবশ্যিক পূর্ণসংখ্যা পড়ে; মান না থাকলে বা সীমার বাইরে হলে অ্যাপ চালু হয় না
function requireIntEnv(name: string, min: number, max: number): number {
  const raw = process.env[name]?.trim();

  if (!raw) throw new Error(`Missing required environment variable: ${name}`);

  const value = Number(raw);

  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }

  return value;
}

export const AUTH_CONFIG = {
  accessTokenSeconds: requireIntEnv("ACCESS_TOKEN_SECONDS", 60, 3_600),
  refreshTokenSeconds: requireIntEnv("REFRESH_TOKEN_SECONDS", 3_600, 2_592_000),
  flowTokenSeconds: requireIntEnv("FLOW_TOKEN_SECONDS", 60, 7_200),
  passwordUpdateSeconds: requireIntEnv("PASSWORD_UPDATE_SECONDS", 60, 1_800),
  oauthStateSeconds: requireIntEnv("OAUTH_STATE_SECONDS", 60, 1_800),

  otpExpiryMinutes: requireIntEnv("OTP_EXPIRY_MINUTES", 1, 60),
  unverifiedUserTtlMinutes: requireIntEnv(
    "UNVERIFIED_USER_TTL_MINUTES",
    5,
    1_440,
  ),
  otpResendCooldownSeconds: requireIntEnv(
    "OTP_RESEND_COOLDOWN_SECONDS",
    10,
    600,
  ),
  maxOtpAttempts: requireIntEnv("MAX_OTP_ATTEMPTS", 1, 10),

  bcryptRounds: requireIntEnv("BCRYPT_ROUNDS", 10, 15),
} as const;

export const RATE_LIMIT_CONFIG = {
  admin: {
    maxRequests: requireIntEnv("ADMIN_RATE_LIMIT_MAX_REQUESTS", 1, 1_000),
    windowMinutes: requireIntEnv("ADMIN_RATE_LIMIT_WINDOW_MINUTES", 1, 1_440),
    blockMinutes: requireIntEnv("ADMIN_RATE_LIMIT_BLOCK_MINUTES", 1, 1_440),
  },
  user: {
    maxRequests: requireIntEnv("USER_RATE_LIMIT_MAX_REQUESTS", 1, 1_000),
    windowMinutes: requireIntEnv("USER_RATE_LIMIT_WINDOW_MINUTES", 1, 1_440),
    blockMinutes: requireIntEnv("USER_RATE_LIMIT_BLOCK_MINUTES", 1, 1_440),
  },
} as const;
