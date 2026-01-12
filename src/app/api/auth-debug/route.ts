import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthCookieName, verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const store = await cookies();
  const token = store.get(getAuthCookieName())?.value ?? null;
  const payload = token ? await verifyAuthToken(token) : null;
  return NextResponse.json({
    hasCookie: Boolean(token),
    payload,
  });
}
