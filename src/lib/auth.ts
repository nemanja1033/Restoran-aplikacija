import { jwtVerify, SignJWT } from "jose";

type AuthPayload = {
  userId: number;
  username: string;
  accountId: number;
  role: "admin" | "staff";
};

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

export async function getAccountIdFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) return null;
  const payload = await verifyAuthToken(token);
  return payload?.accountId ?? null;
}
