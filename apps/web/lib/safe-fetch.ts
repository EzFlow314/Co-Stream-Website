export async function safeFetchJson<T>(
  url: string,
  opts: { timeoutMs?: number; fallback: T; tag?: string; retry?: number; init?: RequestInit } 
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 1200;
  const retry = opts.retry ?? 1;

  for (let attempt = 0; attempt <= retry; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts.init, cache: "no-store", signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`${opts.tag || "fetch"}: http ${res.status}`);
      return (await res.json()) as T;
    } catch (error) {
      clearTimeout(timer);
      const err = error as { code?: string; message?: string; cause?: { code?: string } };
      const code = String(err.code || err.cause?.code || "");
      const message = String(err.message || "");
      const retriable = code.includes("ECONNREFUSED") || code.includes("ETIMEDOUT") || code.includes("ENOTFOUND") || message.includes("fetch failed") || message.includes("aborted");
      if (!retriable || attempt === retry) {
        return opts.fallback;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  return opts.fallback;
}
