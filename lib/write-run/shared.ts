const ALPHABET = "abcdefghijklmnopqrstuvwxyz ";

function hashString32(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function generateNextChar(seed: string, cursor: number): string {
  const value = hashString32(`${seed}:${cursor}`);
  return ALPHABET[value % ALPHABET.length] ?? " ";
}

export function clampPositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}
