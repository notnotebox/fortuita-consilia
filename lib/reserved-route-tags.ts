export const RESERVED_ROUTE_TAGS = new Set([
  "about",
  "api",
  "author",
  "codex",
  "contact",
  "legal",
  "message",
  "privacy",
  "terms",
]);

export function isReservedRouteTag(tag: string): boolean {
  return RESERVED_ROUTE_TAGS.has(tag);
}