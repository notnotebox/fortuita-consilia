function firstForwardedIp(xff: string | null): string | null {
  if (!xff) return null;
  const first = xff.split(",")[0]?.trim();
  return first || null;
}

export function getRequesterIdFromHeaders(headers: Headers): string {
  const forwarded = firstForwardedIp(headers.get("x-forwarded-for"));
  const realIp = headers.get("x-real-ip")?.trim() || null;
  const ip = forwarded || realIp || "unknown";
  return `ip:${ip}`;
}

