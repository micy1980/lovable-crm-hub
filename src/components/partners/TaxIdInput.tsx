import { Input } from '@/components/ui/input';
import { ChangeEvent } from 'react';

interface TaxIdInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function TaxIdInput({ value, onChange, id }: TaxIdInputProps) {
  const formatTaxId = (input: string): string => {
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
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTaxId(e.target.value);
    onChange(formatted);
  };

  return (
    <Input
      id={id}
      value={value}
      onChange={handleChange}
      placeholder="12345678-1-23"
      maxLength={13}
    />
  );
}
