import { AUTH_CONFIG } from "./authConfig";
import { createJWT, verifyJWT } from "./jwt";

export type FlowPurpose =
  | "enter-password"
  | "create-account"
  | "verify-account"
  | "password-reset"
  | "new-password"
  | "verify-add-password"
  | "set-add-password"
  | "verify-change-password"
  | "set-change-password";

export interface FlowPayload {
  purpose: FlowPurpose;
  flowType: string;
  email: string;
  uid: string | null;
  sessionId: string | null;
  verificationId: string | null;
}

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

const SESSION_BOUND: ReadonlySet<FlowPurpose> = new Set([
  "verify-add-password",
  "set-add-password",
  "verify-change-password",
  "set-change-password",
]);

const VERIFICATION_BOUND: ReadonlySet<FlowPurpose> = new Set([
  "set-add-password",
  "set-change-password",
]);

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
