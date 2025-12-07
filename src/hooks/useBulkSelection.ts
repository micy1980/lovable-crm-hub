import { useState, useCallback, useMemo } from 'react';

export interface UseBulkSelectionReturn<T> {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  toggleItem: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  selectItems: (ids: string[]) => void;
  selectedCount: number;
  hasSelection: boolean;
}

export function useBulkSelection<T extends { id: string }>(
  items: T[]
): UseBulkSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      // If all are selected, deselect all
      if (prev.size === itemIds.length && itemIds.length > 0) {
        return new Set();
      }
      // Otherwise, select all
      return new Set(itemIds);
    });
  }, [itemIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const isAllSelected = itemIds.length > 0 && selectedIds.size === itemIds.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < itemIds.length;
  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  return {
    selectedIds,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    selectItems,
    selectedCount,
    hasSelection,
  };
}
