import { AUTH_CONFIG } from "./authConfig";
import { createJWT, verifyJWT } from "./jwt";

// প্রতিটি ধাপের জন্য আলাদা purpose; এক ধাপের টোকেন অন্য ধাপে চলে না
export type FlowPurpose =
  | "enter-password"
  | "create-account"
  | "verify-account"
  | "password-reset"
  | "new-password"
  // লগইন করা ব্যবহারকারীর পাসওয়ার্ড যোগ করা: OTP যাচাই ও নতুন পাসওয়ার্ড জমা
  | "verify-add-password"
  | "set-add-password"
  // লগইন করা ব্যবহারকারীর পাসওয়ার্ড বদলানো: OTP যাচাই ও নতুন পাসওয়ার্ড জমা
  | "verify-change-password"
  | "set-change-password";

export interface FlowPayload {
  purpose: FlowPurpose;
  flowType: string;
  email: string;
  uid: string | null;
  // যে লগইন সেশনের জন্য টোকেনটি বানানো; শুধু লগইন করা ব্যবহারকারীর flow এ থাকে
  sessionId: string | null;
  // OTP যাচাইয়ের রেকর্ডের পরিচয় (otp_uid); শুধু "set-*" টোকেনে থাকে
  verificationId: string | null;
}

// purpose অনুযায়ী flowType নির্ধারিত
const FLOW_TYPES: Record<FlowPurpose, string> = {
  "enter-password": "email",
  "create-account": "email",
  "verify-account": "otp-verification",
  "password-reset": "otp-verification",
  "new-password": "password-reset",
  "verify-add-password": "otp-verification",
  "set-add-password": "password-update",
  "verify-change-password": "otp-verification",
  "set-change-password": "password-update",
};

// কোন purpose এ uid আবশ্যক, কোনটিতে null, আর কোনটিতে দুটোই চলে
const UID_RULES: Record<FlowPurpose, "required" | "null" | "optional"> = {
  "enter-password": "required",
  "create-account": "null",
  "verify-account": "required",
  "password-reset": "optional",
  "new-password": "required",
  "verify-add-password": "required",
  "set-add-password": "required",
  "verify-change-password": "required",
  "set-change-password": "required",
};

// লগইন সেশনের সাথে বাঁধা purpose (sessionId আবশ্যক); বাকিগুলোতে sessionId থাকতে পারবে না
const SESSION_BOUND: ReadonlySet<FlowPurpose> = new Set([
  "verify-add-password",
  "set-add-password",
  "verify-change-password",
  "set-change-password",
]);

// OTP যাচাই শেষে দেওয়া টোকেন (verificationId আবশ্যক); বাকিগুলোতে verificationId থাকতে পারবে না
const VERIFICATION_BOUND: ReadonlySet<FlowPurpose> = new Set([
  "set-add-password",
  "set-change-password",
]);

// flow টোকেন তৈরি করে (মেয়াদ সাধারণত ৩০ মিনিট; expiresInSeconds দিলে সেটি)
export async function createFlowToken(input: {
  purpose: FlowPurpose;
  email: string;
  uid: string | null;
  sessionId?: string;
  verificationId?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  return createJWT(
    {
      email: input.email,
      uid: input.uid,
      purpose: input.purpose,
      flowType: FLOW_TYPES[input.purpose],
      ...(input.sessionId ? { sid: input.sessionId } : {}),
      ...(input.verificationId ? { fid: input.verificationId } : {}),
    },
    input.expiresInSeconds ?? AUTH_CONFIG.flowTokenSeconds,
    "general",
  );
}

// কুকির টোকেন যাচাই করে; অনুমোদিত purpose এর না হলে null ফেরত দেয়
export async function readFlowToken(
  token: string | undefined,
  allowedPurposes: FlowPurpose[],
): Promise<FlowPayload | null> {
  if (!token) return null;

  const payload = await verifyJWT(token, "general");

  if (!payload) return null;

  const purpose = payload.purpose as FlowPurpose;

  if (!allowedPurposes.includes(purpose)) return null;
  if (payload.flowType !== FLOW_TYPES[purpose]) return null;
  if (typeof payload.email !== "string" || !payload.email) return null;

  const uid = payload.uid ?? null;
  const rule = UID_RULES[purpose];

  if (rule === "required" && typeof uid !== "string") return null;
  if (rule === "null" && uid !== null) return null;
  if (uid !== null && typeof uid !== "string") return null;

  // সেশন ও যাচাই-পরিচয়ের ক্ষেত্র শুধু নির্ধারিত purpose এ থাকতে পারে
  const sessionId = payload.sid ?? null;
  const verificationId = payload.fid ?? null;

  if (SESSION_BOUND.has(purpose)) {
    if (typeof sessionId !== "string" || !sessionId) return null;
  } else if (sessionId !== null) {
    return null;
  }

  if (VERIFICATION_BOUND.has(purpose)) {
    if (typeof verificationId !== "string" || !verificationId) return null;
  } else if (verificationId !== null) {
    return null;
  }

  return {
    purpose,
    flowType: payload.flowType as string,
    email: payload.email.trim().toLowerCase(),
    uid,
    sessionId: typeof sessionId === "string" ? sessionId : null,
    verificationId: typeof verificationId === "string" ? verificationId : null,
  };
}
