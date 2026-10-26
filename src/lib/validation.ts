export const EMAIL_MAX_LENGTH = 254;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;
export const OTP_LENGTH = 6;

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function isValidEmail(email: string): boolean {
  return (
    email.length > 0 &&
    email.length <= EMAIL_MAX_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getPasswordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Password must contain at least 8 characters.";
  }

  if (byteLength(password) > PASSWORD_MAX_BYTES) {
    return "Password must not exceed 72 UTF-8 bytes.";
  }

  return null;
}

export function getUsernameError(username: string): string | null {
  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    return "Username must be between 3 and 30 characters.";
  }

  return null;
}

export function isValidOtp(value: string): boolean {
  return /^\d{6}$/.test(value);
}
