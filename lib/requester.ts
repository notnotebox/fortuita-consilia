function firstForwardedIp(xff: string | null): string | null {
  if (!xff) return null;
  const first = xff.split(",")[0]?.trim();
  return first || null;
}

export function getRequesterIdFromHeaders(headers: Headers): string {
  // Never use x-requester-id: it is supplied by the browser and can be
  // changed on every request to bypass an anonymous rate limit.
  const vercelIp = headers.get("x-vercel-forwarded-for")?.trim() || null;
  const realIp = headers.get("x-real-ip")?.trim() || null;
  const forwarded = firstForwardedIp(headers.get("x-forwarded-for"));
  const ip = vercelIp || realIp || forwarded || "unknown";
  return `ip:${ip}`;
}
