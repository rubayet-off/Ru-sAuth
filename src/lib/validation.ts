// এই ফাইলটি ক্লায়েন্ট ও সার্ভার দুই জায়গায় ব্যবহার হয়, তাই এখানে সার্ভার-নির্ভর কিছু রাখা যাবে না

export const EMAIL_MAX_LENGTH = 254;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;
export const OTP_LENGTH = 6;

// স্ট্রিংয়ের UTF-8 বাইট সংখ্যা (bcrypt সর্বোচ্চ ৭২ বাইট পড়ে)
export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

// ইমেইলের মৌলিক গঠন যাচাই
export function isValidEmail(email: string): boolean {
  return (
    email.length > 0 &&
    email.length <= EMAIL_MAX_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

// ইমেইল ছোট হাতের করে ফাঁকা অংশ কেটে নেয়
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// পাসওয়ার্ড ঠিক না হলে এরর মেসেজ ফেরত দেয়, ঠিক থাকলে null
export function getPasswordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Password must contain at least 8 characters.";
  }

  if (byteLength(password) > PASSWORD_MAX_BYTES) {
    return "Password must not exceed 72 UTF-8 bytes.";
  }

  return null;
}

// ইউজারনেম ঠিক না হলে এরর মেসেজ ফেরত দেয়, ঠিক থাকলে null
export function getUsernameError(username: string): string | null {
  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    return "Username must be between 3 and 30 characters.";
  }

  return null;
}

// ছয় অঙ্কের OTP কিনা যাচাই
export function isValidOtp(value: string): boolean {
  return /^\d{6}$/.test(value);
}
