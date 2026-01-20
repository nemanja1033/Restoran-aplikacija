"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("auth_token", token);
      router.replace("/");
      return;
    }
    setError(searchParams.get("error") ? "Neispravna šifra ili lozinka." : "");
  }, [router, searchParams]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setSubmitting(false);
    const data = await response.json().catch(() => null);
    if (response.ok && data?.token) {
      localStorage.setItem("auth_token", data.token);
      router.replace("/");
      return;
    }
    setError(data?.error ?? "Neispravna šifra ili lozinka.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,209,102,0.18),_transparent_45%),linear-gradient(120deg,_rgba(160,196,255,0.15),_transparent_35%),linear-gradient(180deg,_#f8fafc,_#eef2ff)] px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-background/90 p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Finansije
          </p>
          <h1 className="text-2xl font-semibold">Prijava</h1>
        </div>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Šifra</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Lozinka</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
          >
            Uloguj se
          </Button>
        </form>
      </div>
    </div>
  );
}
