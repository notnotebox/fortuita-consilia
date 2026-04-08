type UserTagSource = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

export function normalizeUserTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getUserTag(user: UserTagSource): string {
  const name = user.name?.trim();
  const emailName = user.email?.split("@")[0]?.trim();
  const idPrefix = user.id?.slice(0, 8);
  const raw = name || emailName || idPrefix || "user";
  const normalized = normalizeUserTag(raw);
  if (normalized) return normalized;
  return idPrefix ? normalizeUserTag(idPrefix) : "user";
}

