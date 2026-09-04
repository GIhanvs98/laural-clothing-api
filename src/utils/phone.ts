export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;

  // Remove all spaces, hyphens, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+94')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('94') && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  
  if (cleaned.startsWith('0')) {
    return `+94${cleaned.substring(1)}`;
  }
  
  if (cleaned.length === 9) {
    return `+94${cleaned}`;
  }

  // If it doesn't match Sri Lankan formats but has a plus, return as is (international)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Fallback for an unrecognized format that doesn't have a plus
  return `+94${cleaned}`;
}
