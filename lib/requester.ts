function firstForwardedIp(xff: string | null): string | null {
  if (!xff) return null;
  const first = xff.split(",")[0]?.trim();
  return first || null;
}

function normalizeClientRequesterId(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Keep requester ids predictable and bounded to avoid header abuse.
  const safe = trimmed.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
  return safe || null;
}

export function getRequesterIdFromHeaders(headers: Headers): string {
  const explicitRequesterId = normalizeClientRequesterId(
    headers.get("x-requester-id"),
  );
  if (explicitRequesterId) {
    return `req:${explicitRequesterId}`;
  }

  const forwarded = firstForwardedIp(headers.get("x-forwarded-for"));
  const realIp = headers.get("x-real-ip")?.trim() || null;
  const ip = forwarded || realIp || "unknown";
  return `ip:${ip}`;
}
