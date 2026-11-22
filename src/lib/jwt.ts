import { SignJWT, jwtVerify, type JWTPayload } from "jose";
export type TokenType = "general" | "access" | "refresh";

const SECRET_ENV_NAMES: Record<TokenType, string> = {
  general: "JWT_SECRET",
  access: "JWT_ACCESS_SECRET",
  refresh: "JWT_REFRESH_SECRET",
};

function getSecret(tokenType: TokenType): Uint8Array {
  const secret = process.env[SECRET_ENV_NAMES[tokenType]];

  if (!secret) {
    throw new Error(`Missing JWT secret: ${tokenType}`);
  }

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      `JWT secret for ${tokenType} must be at least 32 characters.`,
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createJWT(
  payload: JWTPayload,
  expiresInSeconds: number,
  tokenType: TokenType,
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret(tokenType));
}

export async function verifyJWT(
  token: string,
  tokenType: TokenType,
): Promise<JWTPayload | null> {
  const secret = getSecret(tokenType);

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return payload;
  } catch {
    return null;
  }
}
