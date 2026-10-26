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

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

export async function sendOTP(
  email: string,
  uid: string,
  purpose: OtpPurpose,
  expiryMinutes: number = AUTH_CONFIG.otpExpiryMinutes,
): Promise<void> {
  const otp = randomInt(100000, 1000000).toString();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

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
