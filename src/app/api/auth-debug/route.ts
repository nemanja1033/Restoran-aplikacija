import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const payload = token ? await verifyAuthToken(token) : null;
  return NextResponse.json({
    hasToken: Boolean(token),
    payload,
  });
}
