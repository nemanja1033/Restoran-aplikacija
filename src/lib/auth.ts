import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

type AuthPayload = {
  userId: number;
  username: string;
  accountId: number;
  role: "admin" | "staff";
};

const AUTH_COOKIE = "auth_token";
const AUTH_SECRET = process.env.AUTH_SECRET;
const encoder = new TextEncoder();

export async function signAuthToken(payload: AuthPayload) {
  if (!AUTH_SECRET) {
    throw new Error("AUTH_SECRET nije postavljen.");
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encoder.encode(AUTH_SECRET));
}

export async function verifyAuthToken(token: string) {
  if (!AUTH_SECRET) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, encoder.encode(AUTH_SECRET));
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export function getAuthCookieName() {
  return AUTH_COOKIE;
}

export async function getSessionAccountId() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAuthToken(token);
  return payload?.accountId ?? null;
}
