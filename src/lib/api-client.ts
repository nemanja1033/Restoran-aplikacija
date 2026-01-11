export async function apiFetch<T>(input: RequestInfo, init?: RequestInit) {
  const method = init?.method ?? "GET";
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: method === "GET" ? "no-store" : "default",
    ...init,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Greška u komunikaciji sa serverom.");
  }

  if (typeof window !== "undefined") {
    if (method !== "GET") {
      window.dispatchEvent(new Event("finance-data-updated"));
    }
  }

  return (await response.json()) as T;
}
