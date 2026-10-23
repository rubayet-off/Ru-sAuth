import { createHash, randomInt, randomUUID } from "node:crypto";

import pool from "@/database/pool";

import { passwordReset } from "../mail/passwordReset";
import { passwordUpdate } from "../mail/passwordUpdate";
import { verifyAccount } from "../mail/verifyAccount";
import { AUTH_CONFIG } from "./authConfig";

export type OtpPurpose =
  | "ACCOUNT_VERIFICATION"
  | "PASSWORD_RESET"
  | "ADD_PASSWORD"
  | "CHANGE_PASSWORD";

// OTP এর SHA-256 হ্যাশ (ডাটাবেসে আসল কোড রাখা হয় না)
export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

// নতুন OTP তৈরি করে ডাটাবেসে রাখে এবং ইমেইলে পাঠায়
export async function sendOTP(
  email: string,
  uid: string,
  purpose: OtpPurpose,
  expiryMinutes: number = AUTH_CONFIG.otpExpiryMinutes,
): Promise<void> {
  const otp = randomInt(100000, 1000000).toString();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // একই ব্যবহারকারীর একই ধরনের পুরোনো OTP থাকলে এক স্টেটমেন্টেই নতুন দিয়ে বদলে দেওয়া হয়
  try {
    await pool.query(
      `
        INSERT INTO otp_tokens
          (otp_uid, user_id, email, code_hash, type, attempts, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, 0, NOW(), $6)
        ON CONFLICT (user_id, type) DO UPDATE
        SET otp_uid = EXCLUDED.otp_uid,
            email = EXCLUDED.email,
            code_hash = EXCLUDED.code_hash,
            attempts = 0,
            created_at = NOW(),
            expires_at = EXCLUDED.expires_at
      `,
      [randomUUID(), uid, email, codeHash, purpose, expiresAt],
    );
  } catch (error) {
    console.error("OTP database error:", error);
    throw new Error("Failed to create OTP");
  }

  // ইমেইল পাঠানো ব্যর্থ হলে এই OTP মুছে ফেলা হয়, যাতে অকেজো কোড পড়ে না থাকে
  try {
    if (purpose === "ACCOUNT_VERIFICATION") {
      await verifyAccount(email, otp, expiryMinutes);
    } else if (purpose === "PASSWORD_RESET") {
      await passwordReset(email, otp, expiryMinutes);
    } else {
      await passwordUpdate(
        email,
        otp,
        expiryMinutes,
        purpose === "ADD_PASSWORD" ? "add" : "change",
      );
    }
  } catch (error) {
    await pool
      .query(
        `DELETE FROM otp_tokens WHERE user_id = $1 AND type = $2 AND code_hash = $3`,
        [uid, purpose, codeHash],
      )
      .catch((cleanupError) => {
        console.error("OTP cleanup error:", cleanupError);
      });

    console.error("OTP email error:", error);
    throw new Error("Failed to send OTP email");
  }
}

// শেষ OTP পাঠানোর পর আবার পাঠাতে আর কত সেকেন্ড অপেক্ষা করতে হবে (০ মানে এখনই পাঠানো যাবে)
export async function getOtpCooldownSeconds(
  uid: string,
  purpose: OtpPurpose,
): Promise<number> {
  const result = await pool.query<{ remaining: number }>(
    `
      SELECT GREATEST(
        0,
        CEIL(EXTRACT(EPOCH FROM (created_at + ($3 * INTERVAL '1 second') - NOW())))
      )::int AS remaining
      FROM otp_tokens
      WHERE user_id = $1
        AND type = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [uid, purpose, AUTH_CONFIG.otpResendCooldownSeconds],
  );

  return result.rows[0]?.remaining ?? 0;
}
