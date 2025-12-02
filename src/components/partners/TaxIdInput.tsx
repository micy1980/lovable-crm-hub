import { Input } from '@/components/ui/input';
import { ChangeEvent, useEffect, useState } from 'react';
import { formatTaxId, validateHungarianTaxId, TaxIdValidationResult } from '@/lib/taxIdValidation';

interface TaxIdInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  id?: string;
  required?: boolean;
}

export function TaxIdInput({ value, onChange, onValidationChange, id, required = false }: TaxIdInputProps) {
  const [touched, setTouched] = useState(false);
  const [validation, setValidation] = useState<TaxIdValidationResult>({ isValid: true });

  useEffect(() => {
    if (touched || value) {
      const result = validateHungarianTaxId(value);
      setValidation(result);
      onValidationChange?.(result.isValid);
    } else if (!required) {
      setValidation({ isValid: true });
      onValidationChange?.(true);
    }
  }, [value, touched, required, onValidationChange]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTaxId(e.target.value);
    onChange(formatted);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const showError = touched && !validation.isValid;

  return (
    <div className="space-y-1">
      <Input
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="12345678-1-23"
        maxLength={13}
        className={showError ? 'border-destructive' : ''}
      />
      {showError && validation.errorMessage && (
        <p className="text-sm text-destructive">{validation.errorMessage}</p>
      )}
    </div>
  );
}
