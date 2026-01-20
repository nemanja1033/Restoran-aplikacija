"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    const handleLogout = () => {
      router.replace("/login");
    };
    window.addEventListener("auth-logout", handleLogout);
    return () => window.removeEventListener("auth-logout", handleLogout);
  }, [router]);

  if (!ready) return null;

  return <>{children}</>;
}
