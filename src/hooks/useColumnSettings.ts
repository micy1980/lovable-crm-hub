import { useState, useEffect, useCallback, useMemo } from 'react';

export interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  required?: boolean; // Cannot be hidden
  sortable?: boolean; // Whether column can be sorted (default: true)
}

export interface ColumnState {
  key: string;
  visible: boolean;
  width: number;
  order: number;
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface UseColumnSettingsOptions {
  storageKey: string;
  columns: ColumnConfig[];
}

interface UseColumnSettingsReturn {
  columnStates: ColumnState[];
  visibleColumns: ColumnState[];
  toggleVisibility: (key: string) => void;
  setColumnWidth: (key: string, width: number) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  resetToDefaults: () => void;
  getColumnConfig: (key: string) => ColumnConfig | undefined;
}

const DEFAULT_WIDTH = 150;
const MIN_WIDTH = 50;

export function useColumnSettings({
  storageKey,
  columns,
}: UseColumnSettingsOptions): UseColumnSettingsReturn {
  const getDefaultStates = useCallback((): ColumnState[] => {
    return columns.map((col, index) => ({
      key: col.key,
      visible: col.defaultVisible !== false,
      width: col.defaultWidth || DEFAULT_WIDTH,
      order: index,
    }));
  }, [columns]);

  const loadFromStorage = useCallback((): ColumnState[] => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: ColumnState[] = JSON.parse(saved);
        // Merge with current columns in case new columns were added
        const savedMap = new Map(parsed.map((s) => [s.key, s]));
        return columns.map((col, index) => {
          const saved = savedMap.get(col.key);
          if (saved) {
            return {
              ...saved,
              // Ensure required columns stay visible
              visible: col.required ? true : saved.visible,
            };
          }
          return {
            key: col.key,
            visible: col.defaultVisible !== false,
            width: col.defaultWidth || DEFAULT_WIDTH,
            order: index + parsed.length, // Put new columns at the end
          };
        }).sort((a, b) => a.order - b.order);
      }
    } catch (e) {
      console.error('Failed to load column settings:', e);
    }
    return getDefaultStates();
  }, [storageKey, columns, getDefaultStates]);

  const [columnStates, setColumnStates] = useState<ColumnState[]>(loadFromStorage);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columnStates));
  }, [storageKey, columnStates]);

  // Recalculate if columns definition changes
  useEffect(() => {
    setColumnStates(loadFromStorage());
  }, [columns.length]);

  const visibleColumns = useMemo(() => {
    return columnStates
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order);
  }, [columnStates]);

  const toggleVisibility = useCallback((key: string) => {
    const config = columns.find((c) => c.key === key);
    if (config?.required) return; // Cannot hide required columns

    setColumnStates((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  }, [columns]);

  const setColumnWidth = useCallback((key: string, width: number) => {
    const config = columns.find((c) => c.key === key);
    const minWidth = config?.minWidth || MIN_WIDTH;
    const newWidth = Math.max(minWidth, width);

    setColumnStates((prev) =>
      prev.map((c) => (c.key === key ? { ...c, width: newWidth } : c))
    );
  }, [columns]);

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumnStates((prev) => {
      const visible = prev.filter((c) => c.visible).sort((a, b) => a.order - b.order);
      const hidden = prev.filter((c) => !c.visible);
      
      // Move the item
      const [movedItem] = visible.splice(fromIndex, 1);
      visible.splice(toIndex, 0, movedItem);
      
      // Reassign order values
      const reordered = visible.map((c, i) => ({ ...c, order: i }));
      const hiddenWithOrder = hidden.map((c, i) => ({ ...c, order: visible.length + i }));
      
      return [...reordered, ...hiddenWithOrder];
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setColumnStates(getDefaultStates());
  }, [getDefaultStates]);

  const getColumnConfig = useCallback(
    (key: string) => columns.find((c) => c.key === key),
    [columns]
  );

  return {
    columnStates,
    visibleColumns,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  };
}
