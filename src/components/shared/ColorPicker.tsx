import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const PRESET_COLORS = [
  { value: 'blue', label: 'Kék', class: 'bg-blue-500' },
  { value: 'green', label: 'Zöld', class: 'bg-green-500' },
  { value: 'orange', label: 'Narancs', class: 'bg-orange-500' },
  { value: 'red', label: 'Piros', class: 'bg-red-500' },
  { value: 'purple', label: 'Lila', class: 'bg-purple-500' },
  { value: 'pink', label: 'Rózsaszín', class: 'bg-pink-500' },
  { value: 'cyan', label: 'Cián', class: 'bg-cyan-500' },
  { value: 'yellow', label: 'Sárga', class: 'bg-yellow-500' },
  { value: 'indigo', label: 'Indigó', class: 'bg-indigo-500' },
  { value: 'teal', label: 'Türkiz', class: 'bg-teal-500' },
] as const;

export type PresetColor = typeof PRESET_COLORS[number]['value'];

interface ColorPickerProps {
  value: string | null | undefined;
  onChange: (color: string | null) => void;
  label?: string;
  allowNone?: boolean;
}

export const ColorPicker = ({ value, onChange, label, allowNone = true }: ColorPickerProps) => {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {allowNone && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cn(
              "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
              !value 
                ? "border-primary ring-2 ring-primary/30" 
                : "border-muted-foreground/30 hover:border-muted-foreground/50"
            )}
            title="Alapértelmezett"
          >
            {!value && <Check className="h-4 w-4 text-muted-foreground" />}
          </button>
        )}
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={cn(
              "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
              color.class,
              value === color.value 
                ? "border-foreground ring-2 ring-foreground/30" 
                : "border-transparent hover:scale-110"
            )}
            title={color.label}
          >
            {value === color.value && <Check className="h-4 w-4 text-white" />}
          </button>
        ))}
      </div>
    </div>
  );
};

// Helper function to get Tailwind class for a color value
export const getColorClass = (colorValue: string | null | undefined, type: 'bg' | 'text' = 'bg'): string => {
  if (!colorValue) return '';
  
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-500' },
    green: { bg: 'bg-green-500', text: 'text-green-500' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-500' },
    red: { bg: 'bg-red-500', text: 'text-red-500' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-500' },
    pink: { bg: 'bg-pink-500', text: 'text-pink-500' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-500' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-500' },
    indigo: { bg: 'bg-indigo-500', text: 'text-indigo-500' },
    teal: { bg: 'bg-teal-500', text: 'text-teal-500' },
  };
  
  return colorMap[colorValue]?.[type] || '';
};
