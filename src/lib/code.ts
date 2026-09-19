const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Builds a 6-character family code using a kid-safe alphabet (no 0/O/1/I/L).
 */
export function makeFamilyCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/**
 * Normalizes a typed family code for lookup.
 */
export function normalizeFamilyCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}
