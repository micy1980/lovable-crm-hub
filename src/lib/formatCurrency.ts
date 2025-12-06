/**
 * Format a number as currency with configurable thousand and decimal separators
 */

export interface NumberFormatSettings {
  useSystemLocale: boolean;
  thousandSeparator: string;
  decimalSeparator: string;
}

/**
 * Get decimal places for a given currency
 * HUF: 0 decimals, EUR/USD and others: 2 decimals
 */
export const getDecimalPlaces = (currency: string): number => {
  const noDecimalCurrencies = ['HUF', 'JPY', 'KRW', 'VND'];
  return noDecimalCurrencies.includes(currency.toUpperCase()) ? 0 : 2;
};

/**
 * Format a number with custom separators
 */
export const formatNumberWithSeparators = (
  value: number,
  decimalPlaces: number,
  thousandSeparator: string,
  decimalSeparator: string
): string => {
  // Round to desired decimal places
  const factor = Math.pow(10, decimalPlaces);
  const rounded = Math.round(value * factor) / factor;
  
  // Split into integer and decimal parts
  const [intPart, decPart] = rounded.toFixed(decimalPlaces).split('.');
  
  // Add thousand separators to integer part
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  
  // Combine parts
  if (decimalPlaces === 0) {
    return formattedInt;
  }
  
  return `${formattedInt}${decimalSeparator}${decPart}`;
};

/**
 * Format currency value using system settings or browser locale
 */
export const formatCurrency = (
  value: number | null | undefined,
  currency: string = 'HUF',
  settings?: NumberFormatSettings
): string => {
  if (value === null || value === undefined) {
    return '-';
  }

  const decimalPlaces = getDecimalPlaces(currency);

  // If no settings provided or using system locale
  if (!settings || settings.useSystemLocale) {
    return value.toLocaleString('hu-HU', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  }

  // Use custom separators
  return formatNumberWithSeparators(
    value,
    decimalPlaces,
    settings.thousandSeparator,
    settings.decimalSeparator
  );
};

/**
 * Hook helper to get format settings from system settings object
 */
export const getNumberFormatSettings = (
  systemSettings: Record<string, string> | undefined
): NumberFormatSettings => {
  if (!systemSettings) {
    return {
      useSystemLocale: true,
      thousandSeparator: ' ',
      decimalSeparator: ',',
    };
  }

  return {
    useSystemLocale: systemSettings.use_system_locale_formatting !== 'false',
    thousandSeparator: systemSettings.number_thousand_separator || ' ',
    decimalSeparator: systemSettings.number_decimal_separator || ',',
  };
};
