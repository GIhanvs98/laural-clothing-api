export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;

  // Remove all spaces, hyphens, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+94')) {
    return `0${cleaned.substring(3)}`;
  }
  
  if (cleaned.startsWith('94') && cleaned.length === 11) {
    return `0${cleaned.substring(2)}`;
  }
  
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    return `0${cleaned}`;
  }

  return cleaned;
}
