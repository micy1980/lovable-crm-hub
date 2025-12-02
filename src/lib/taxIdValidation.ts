// Hungarian Tax ID (Adószám) Validation
// Format: xxxxxxxx-y-zz (8 digits - 1 digit - 2 digits)

const VALID_REGIONAL_CODES = [
  '02', '22', // Baranya
  '03', '23', // Bács-Kiskun
  '04', '24', // Békés
  '05', '25', // Borsod-Abaúj-Zemplén
  '06', '26', // Csongrád-Csanád
  '07', '27', // Fejér
  '08', '28', // Győr-Moson-Sopron
  '09', '29', // Hajdú-Bihar
  '10', '30', // Heves
  '11', '31', // Komárom-Esztergom
  '12', '32', // Nógrád
  '13', '33', // Pest
  '14', '34', // Somogy
  '15', '35', // Szabolcs-Szatmár-Bereg
  '16', '36', // Jász-Nagykun-Szolnok
  '17', '37', // Tolna
  '18', '38', // Vas
  '19', '39', // Veszprém
  '20', '40', // Zala
  '41', // Észak-Budapest
  '42', // Kelet-Budapest
  '43', // Dél-Budapest
  '44', // Kiemelt Adózók Adóigazgatósága
  '51', // Kiemelt Ügyek / külföldi illetőségű adóalanyok
];

export interface TaxIdValidationResult {
  isValid: boolean;
  errorKey?: string; // i18n key
  errorMessage?: string;
}

export function validateHungarianTaxId(taxId: string): TaxIdValidationResult {
  if (!taxId || taxId.trim() === '') {
    return { isValid: false, errorKey: 'partners.taxIdRequired', errorMessage: 'Az adószám megadása kötelező' };
  }

  // Remove dashes and spaces
  const digits = taxId.replace(/[-\s]/g, '');

  // Check length - must be exactly 11 digits
  if (digits.length !== 11) {
    return { isValid: false, errorKey: 'partners.taxIdInvalidLength', errorMessage: 'Az adószámnak 11 számjegyből kell állnia' };
  }

  // Check if all characters are digits
  if (!/^\d{11}$/.test(digits)) {
    return { isValid: false, errorKey: 'partners.taxIdInvalidFormat', errorMessage: 'Az adószám csak számokat tartalmazhat' };
  }

  // Extract parts
  const taxBase = digits.substring(0, 8); // First 8 digits (including check digit at position 8)
  const vatCode = digits.charAt(8); // 9th digit - VAT code
  const regionalCode = digits.substring(9, 11); // 10-11th digits - Regional code

  // Validate check digit (8th digit)
  const weights = [9, 7, 3, 1, 9, 7, 3];
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(taxBase.charAt(i), 10) * weights[i];
  }
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  const actualCheckDigit = parseInt(taxBase.charAt(7), 10);

  if (actualCheckDigit !== expectedCheckDigit) {
    return { isValid: false, errorKey: 'partners.taxIdInvalidCheckDigit', errorMessage: 'Az adószám ellenőrzőszáma hibás' };
  }

  // Validate VAT code (9th digit) - must be 1-5
  const vatCodeNum = parseInt(vatCode, 10);
  if (vatCodeNum < 1 || vatCodeNum > 5) {
    return { isValid: false, errorKey: 'partners.taxIdInvalidVatCode', errorMessage: 'Az ÁFA-kód (9. számjegy) 1-5 között kell legyen' };
  }

  // Validate regional code (10-11th digits)
  if (!VALID_REGIONAL_CODES.includes(regionalCode)) {
    return { isValid: false, errorKey: 'partners.taxIdInvalidRegionalCode', errorMessage: 'A területi kód (10-11. számjegy) érvénytelen' };
  }

  return { isValid: true };
}

export function formatTaxId(input: string): string {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  // Format as xxxxxxxx-x-xx
  let formatted = '';
  for (let i = 0; i < digits.length && i < 11; i++) {
    if (i === 8 || i === 9) {
      formatted += '-';
    }
    formatted += digits[i];
  }
  
  return formatted;
}
