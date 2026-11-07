/**
 * Smart Form Validation & Sanitization Engine for CaryGoo
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  formattedValue?: string;
}

/**
 * Validates Indian Mobile Numbers (10 digits starting with 6, 7, 8, or 9)
 * Strips out leading 0 or +91 prefixes and normalizes to standard 10-digit number.
 */
export function validateIndianPhone(phone: string): ValidationResult {
  if (!phone) return { isValid: false, error: 'Phone number is required' };

  // Remove whitespace, dashes, parens
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  let digits = cleaned;

  if (digits.startsWith('+91')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (!/^\d+$/.test(digits)) {
    return { isValid: false, error: 'Phone number must contain only digits' };
  }

  if (digits.length !== 10) {
    return {
      isValid: false,
      error: digits.length < 10 ? 'Enter full 10-digit mobile number' : 'Number cannot exceed 10 digits',
      formattedValue: digits,
    };
  }

  if (!/^[6-9]/.test(digits)) {
    return {
      isValid: false,
      error: 'Indian mobile numbers must start with 6, 7, 8, or 9',
      formattedValue: digits,
    };
  }

  // Formatted as "+91 98765 43210"
  const formatted = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return { isValid: true, formattedValue: formatted };
}

/**
 * Validates 6-Digit Indian Postal PIN Codes
 */
export function validatePincode(pincode: string): ValidationResult {
  const cleaned = pincode.trim().replace(/\D/g, '');
  if (cleaned.length === 0) return { isValid: false, error: 'PIN code is required' };
  if (cleaned.length !== 6) return { isValid: false, error: 'PIN code must be exactly 6 digits', formattedValue: cleaned };
  if (cleaned.startsWith('0')) return { isValid: false, error: 'Invalid PIN code (cannot start with 0)', formattedValue: cleaned };

  return { isValid: true, formattedValue: cleaned };
}

/**
 * Validates Luggage Capacity / Parcel Weight based on Vehicle Type
 */
export function validateLuggageCapacity(
  weightKg: number,
  vehicleType: 'flight' | 'train' | 'car' | 'bus' | 'bike' | 'other'
): ValidationResult {
  if (isNaN(weightKg) || weightKg <= 0) {
    return { isValid: false, error: 'Weight must be greater than 0 kg' };
  }

  const limits: Record<string, { max: number; warningThreshold: number }> = {
    bike: { max: 8, warningThreshold: 5 },
    flight: { max: 15, warningThreshold: 10 },
    car: { max: 35, warningThreshold: 20 },
    bus: { max: 20, warningThreshold: 15 },
    train: { max: 35, warningThreshold: 25 },
    other: { max: 30, warningThreshold: 20 },
  };

  const limit = limits[vehicleType] || limits.other;

  if (weightKg > limit.max) {
    return {
      isValid: false,
      error: `Max capacity for ${vehicleType} is ${limit.max} kg. Consider splitting or using train/car.`,
    };
  }

  if (weightKg > limit.warningThreshold) {
    return {
      isValid: true,
      warning: `Heavy luggage (${weightKg} kg). Ensure your vehicle has adequate boot/cabin space.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates Delivery Pricing based on Weight and Category
 */
export function validateDeliveryPrice(priceRupees: number, weightKg: number): ValidationResult {
  if (isNaN(priceRupees) || priceRupees <= 0) {
    return { isValid: false, error: 'Please enter a valid delivery fee' };
  }

  const MIN_PRICE = 50;
  const MAX_PRICE = 25000;

  if (priceRupees < MIN_PRICE) {
    return { isValid: false, error: `Minimum delivery fee is ₹${MIN_PRICE}` };
  }

  if (priceRupees > MAX_PRICE) {
    return { isValid: false, error: `Maximum fee allowed is ₹${MAX_PRICE.toLocaleString('en-IN')}` };
  }

  // Recommended price range check: typically ₹80 - ₹250 per kg
  const estimatedMin = Math.max(MIN_PRICE, Math.round(weightKg * 60));
  const estimatedMax = Math.max(300, Math.round(weightKg * 450));

  if (priceRupees < estimatedMin) {
    return {
      isValid: true,
      warning: `Your offer (₹${priceRupees}) is below the average corridor rate (₹${estimatedMin}-₹${estimatedMax}). May take longer to match.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates 12-digit Indian Aadhaar Format
 */
export function validateAadhaar(aadhaar: string): ValidationResult {
  const cleaned = aadhaar.replace(/\s+/g, '').replace(/\D/g, '');
  if (cleaned.length === 0) return { isValid: false, error: 'Aadhaar number is required' };
  if (cleaned.length !== 12) return { isValid: false, error: 'Aadhaar must be 12 digits', formattedValue: cleaned };

  const formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)}`;
  return { isValid: true, formattedValue: formatted };
}

/**
 * Validates 10-character Indian PAN Card format (ABCDE1234F)
 */
export function validatePAN(pan: string): ValidationResult {
  const cleaned = pan.trim().toUpperCase();
  if (cleaned.length === 0) return { isValid: false, error: 'PAN is required' };

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid PAN format. Must be 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)',
      formattedValue: cleaned,
    };
  }

  return { isValid: true, formattedValue: cleaned };
}

