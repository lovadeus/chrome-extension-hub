// Shared helpers for the public license API consumed by the Chrome extension.

export function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * The extension must send `x-api-key: <EXTENSION_API_KEY>`.
 * The secret lives only in the backend environment.
 */
export function requireApiKey(request: Request): Response | null {
  const expected = process.env["EXTENSION_API_KEY"];
  if (!expected) return json({ error: "api_not_configured" }, 503);
  const provided = request.headers.get("x-api-key") ?? "";
  if (provided.length !== expected.length) return json({ error: "unauthorized" }, 401);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return json({ error: "unauthorized" }, 401);
  return null;
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}
