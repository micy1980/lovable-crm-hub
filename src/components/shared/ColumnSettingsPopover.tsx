import { useState, useRef } from 'react';
import { GripVertical, Settings2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { ColumnState, ColumnConfig } from '@/hooks/useColumnSettings';

interface ColumnSettingsPopoverProps {
  columnStates: ColumnState[];
  columns: ColumnConfig[];
  onToggleVisibility: (key: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;
}

export function ColumnSettingsPopover({
  columnStates,
  columns,
  onToggleVisibility,
  onReorder,
  onReset,
}: ColumnSettingsPopoverProps) {
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggedItemRef = useRef<string | null>(null);

  // Sort by order for display
  const sortedStates = [...columnStates].sort((a, b) => a.order - b.order);

  const getColumnLabel = (key: string) => {
    return columns.find((c) => c.key === key)?.label || key;
  };

  const isRequired = (key: string) => {
    return columns.find((c) => c.key === key)?.required || false;
  };

  const handleDragStart = (e: React.DragEvent, index: number, key: string) => {
    setDraggedIndex(index);
    draggedItemRef.current = key;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    draggedItemRef.current = null;
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    draggedItemRef.current = null;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          {t('common.columns')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t('common.visibleColumns')}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 px-2 text-xs"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              {t('common.reset')}
            </Button>
          </div>
          <Separator />
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {sortedStates.map((state, index) => (
              <div
                key={state.key}
                draggable
                onDragStart={(e) => handleDragStart(e, index, state.key)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 p-1.5 rounded-md transition-colors cursor-move ${
                  dragOverIndex === index ? 'bg-accent' : 'hover:bg-accent/50'
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <Checkbox
                  id={`col-${state.key}`}
                  checked={state.visible}
                  onCheckedChange={() => onToggleVisibility(state.key)}
                  disabled={isRequired(state.key)}
                />
                <Label
                  htmlFor={`col-${state.key}`}
                  className="text-sm cursor-pointer flex-1 select-none"
                >
                  {getColumnLabel(state.key)}
                </Label>
              </div>
            ))}
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            {t('common.dragToReorder')}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
