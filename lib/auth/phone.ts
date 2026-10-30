// Login identifier is a Bangladeshi mobile number, stored as 11 digits: 01XXXXXXXXX.
// Accepts "+880 1712-345678", "8801712345678", "01712 345 678", and Bangla digits.

const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

export function normalizePhone(input: string): string | null {
  let s = input.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
  s = s.replace(/[\s\-().]/g, "");
  if (s.startsWith("+880")) s = "0" + s.slice(4);
  else if (s.startsWith("880") && s.length === 13) s = "0" + s.slice(3);
  return /^01[3-9]\d{8}$/.test(s) ? s : null;
}

/**
 * Better Auth needs an email for its email + password flow. Accounts are identified by phone only,
 * so each gets an address under the reserved ".invalid" TLD, which can never receive mail.
 */
export const placeholderEmail = (phone: string) => `${phone}@phone.alta.invalid`;

export const MIN_PASSWORD_LENGTH = 8;
