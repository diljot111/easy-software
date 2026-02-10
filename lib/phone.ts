/**
 * Normalize phone numbers for WhatsApp
 * - Removes spaces, +, -
 * - Adds country code if missing
 */
export function normalizeWhatsAppNumber(
  raw: string,
  countryCode = "91"
): string {
  if (!raw) return raw;

  // remove spaces, +, -
  let phone = raw.replace(/[^\d]/g, "");

  // already has country code
  if (phone.startsWith(countryCode) && phone.length > 10) {
    return phone;
  }

  // Indian 10-digit number
  if (phone.length === 10) {
    return countryCode + phone;
  }

  // fallback (return as-is)
  return phone;
}
