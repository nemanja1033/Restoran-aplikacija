"use client";

import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.assign("/login");
      return;
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
