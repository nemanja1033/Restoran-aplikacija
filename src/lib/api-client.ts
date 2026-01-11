export async function apiFetch<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Greška u komunikaciji sa serverom.");
  }

  if (typeof window !== "undefined") {
    const method = init?.method ?? "GET";
    if (method !== "GET") {
      window.dispatchEvent(new Event("finance-data-updated"));
    }
  }

  return (await response.json()) as T;
}
