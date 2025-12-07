import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Repeat } from 'lucide-react';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface RecurrenceFieldsProps {
  recurrenceType: RecurrenceType;
  recurrenceInterval: number;
  recurrenceEndDate: string;
  onRecurrenceTypeChange: (value: RecurrenceType) => void;
  onRecurrenceIntervalChange: (value: number) => void;
  onRecurrenceEndDateChange: (value: string) => void;
  disabled?: boolean;
}

export const RecurrenceFields = ({
  recurrenceType,
  recurrenceInterval,
  recurrenceEndDate,
  onRecurrenceTypeChange,
  onRecurrenceIntervalChange,
  onRecurrenceEndDateChange,
  disabled = false,
}: RecurrenceFieldsProps) => {
  const { t } = useTranslation();

  const recurrenceLabels: Record<RecurrenceType, string> = {
    none: 'Nincs',
    daily: 'Naponta',
    weekly: 'Hetente',
    monthly: 'Havonta',
    yearly: 'Évente',
  };

  const intervalLabels: Record<RecurrenceType, string> = {
    none: '',
    daily: 'nap',
    weekly: 'hét',
    monthly: 'hónap',
    yearly: 'év',
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Repeat className="h-4 w-4" />
        Ismétlődés
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Gyakoriság</Label>
          <Select
            value={recurrenceType}
            onValueChange={(v) => onRecurrenceTypeChange(v as RecurrenceType)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(recurrenceLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {recurrenceType !== 'none' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Minden</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={99}
                value={recurrenceInterval}
                onChange={(e) => onRecurrenceIntervalChange(parseInt(e.target.value) || 1)}
                className="h-9 w-16"
                disabled={disabled}
              />
              <span className="text-sm text-muted-foreground">
                {intervalLabels[recurrenceType]}
              </span>
            </div>
          </div>
        )}
      </div>

      {recurrenceType !== 'none' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Ismétlődés vége (opcionális)</Label>
          <Input
            type="date"
            value={recurrenceEndDate}
            onChange={(e) => onRecurrenceEndDateChange(e.target.value)}
            className="h-9"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};
