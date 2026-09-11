// Shared, deliberately-simple email format check. Not a full RFC 5322
// validator — it rejects the obviously-malformed values (missing "@",
// missing domain/TLD, embedded whitespace) that would otherwise be
// persisted and silently fail at email dispatch time.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
