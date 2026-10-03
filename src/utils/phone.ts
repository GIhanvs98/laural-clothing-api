export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;

  // Remove all spaces, hyphens, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+94')) {
    cleaned = `0${cleaned.substring(3)}`;
  } else if (cleaned.startsWith('94') && cleaned.length === 11) {
    cleaned = `0${cleaned.substring(2)}`;
  } else if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    cleaned = `0${cleaned}`;
  }

  return cleaned;
}

export function isValidPhone(phone: string): boolean {
  return /^0\d{9}$/.test(phone);
}
