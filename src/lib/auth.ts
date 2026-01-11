import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

type AuthPayload = {
  userId: number;
  username: string;
  accountId: number;
  role: "admin" | "staff";
};

const AUTH_COOKIE = "auth_token";
const AUTH_SECRET = process.env.AUTH_SECRET;

export function signAuthToken(payload: AuthPayload) {
  if (!AUTH_SECRET) {
    throw new Error("AUTH_SECRET nije postavljen.");
  }
  return jwt.sign(payload, AUTH_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string) {
  if (!AUTH_SECRET) {
    return null;
  }
  try {
    return jwt.verify(token, AUTH_SECRET) as AuthPayload;
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
  const payload = verifyAuthToken(token);
  return payload?.accountId ?? null;
}
