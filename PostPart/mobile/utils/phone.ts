/**
 * Phone number utilities for Africa's Talking integration
 */

/**
 * Format phone number to international format (+256XXXXXXXXX)
 * Handles various input formats:
 * - 0700123456 -> +256700123456
 * - 256700123456 -> +256700123456
 * - +256700123456 -> +256700123456
 * - 700123456 -> +256700123456 (assumes Uganda)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading + if present (we'll add it back)
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = cleaned.substring(1);
  }

  // Handle Uganda numbers (256 country code)
  if (cleaned.startsWith('256')) {
    // Already has country code
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    // Local format (0700123456) - remove leading 0 and add 256
    return '+256' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    // 9 digits without leading 0 (700123456) - add 256
    return '+256' + cleaned;
  } else if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // 10 digits with leading 0 (0700123456) - remove 0 and add 256
    return '+256' + cleaned.substring(1);
  } else if (cleaned.length >= 9 && cleaned.length <= 15) {
    // Assume it's already in international format, just add +
    return '+' + cleaned;
  }

  // Return as-is if we can't determine format
  return hasPlus ? phone : '+' + cleaned;
}

/**
 * Validate phone number format
 * Accepts international format: +256XXXXXXXXX (9 digits after country code)
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Format the phone number
  const formatted = formatPhoneNumber(phone);

  // Check if it matches international format: +256 followed by 9 digits
  const ugandaRegex = /^\+256[0-9]{9}$/;

  if (!ugandaRegex.test(formatted)) {
    // Try other common African country codes
    const africaRegex = /^\+2[0-9]{1,2}[0-9]{8,9}$/;
    if (africaRegex.test(formatted)) {
      return { valid: true };
    }

    return {
      valid: false,
      error: 'Please enter a valid phone number (e.g., 0700123456 or +256700123456)',
    };
  }

  return { valid: true };
}

/**
 * Get phone number display format (for UI)
 * Converts +256700123456 to 0700 123 456
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';

  const formatted = formatPhoneNumber(phone);

  // For Uganda numbers: +256700123456 -> 0700 123 456
  if (formatted.startsWith('+256') && formatted.length === 13) {
    const digits = formatted.substring(4); // Remove +256
    return `0${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }

  return formatted;
}

