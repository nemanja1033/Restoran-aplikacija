import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import bcrypt from "bcryptjs";
import { getAuthCookieName, signAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const contentType = request.headers.get("content-type") ?? "";
    let username = "";
    let password = "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      username = String(body?.username ?? "").trim();
      password = String(body?.password ?? "");
    } else {
      const form = await request.formData();
      username = String(form.get("username") ?? "").trim();
      password = String(form.get("password") ?? "");
    }
    if (!username || !password) {
      return NextResponse.json(
        { error: "Unesite šifru i lozinku." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      if (!contentType.includes("application/json")) {
        return NextResponse.redirect(new URL("/login?error=1", request.url));
      }
      return NextResponse.json(
        { error: "Neispravna šifra ili lozinka." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      if (!contentType.includes("application/json")) {
        return NextResponse.redirect(new URL("/login?error=1", request.url));
      }
      return NextResponse.json(
        { error: "Neispravna šifra ili lozinka." },
        { status: 401 }
      );
    }

    const token = await signAuthToken({
      userId: user.id,
      username: user.username,
      accountId: user.accountId,
      role: user.role,
    });

    const response = contentType.includes("application/json")
      ? NextResponse.json({ success: true })
      : NextResponse.redirect(new URL("/", request.url), 303);
    response.cookies.set({
      name: getAuthCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.redirect(new URL("/login?error=1", request.url));
    }
    return NextResponse.json(
      { error: "Neuspešna prijava." },
      { status: 400 }
    );
  }
}
