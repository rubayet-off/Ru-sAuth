import type { NextRequest } from "next/server";
import { COOKIE_NAMES } from "./cookieNames";
import { verifyJWT } from "./jwt";

export type EntityKind = "user" | "admin";

async function readKind(
  token: string | undefined,
  tokenType: "access" | "refresh",
): Promise<EntityKind | null> {
  if (!token) return null;

  try {
    const payload = await verifyJWT(token, tokenType);

    if (
      !payload ||
      typeof payload.uid !== "string" ||
      typeof payload.sessionId !== "string" ||
      (payload.entityType !== "user" && payload.entityType !== "admin")
    ) {
      return null;
    }

    return payload.entityType;
  } catch {
    return null;
  }
}

export async function readRequestEntity(
  request: NextRequest,
): Promise<EntityKind | null> {
  const fromAccess = await readKind(
    request.cookies.get(COOKIE_NAMES.access)?.value,
    "access",
  );

  if (fromAccess) return fromAccess;

  return readKind(request.cookies.get(COOKIE_NAMES.refresh)?.value, "refresh");
}
