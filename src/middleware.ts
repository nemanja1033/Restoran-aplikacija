import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/login") || pathname.startsWith("/api/logout")) {
    return NextResponse.next();
  }
  const token = request.cookies.get("auth_token")?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
