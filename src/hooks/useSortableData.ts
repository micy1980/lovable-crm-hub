import { useState, useMemo, useCallback } from 'react';

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface UseSortableDataOptions<T> {
  data: T[];
  defaultSort?: SortState;
  sortFunctions?: Record<string, (a: T, b: T) => number>;
}

export function useSortableData<T extends Record<string, any>>({
  data,
  defaultSort,
  sortFunctions = {},
}: UseSortableDataOptions<T>) {
  const [sortState, setSortState] = useState<SortState | null>(defaultSort || null);

  const handleSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev?.key === key) {
        // Toggle direction or clear
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null; // Clear sorting
        }
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortState) return data;

    const { key, direction } = sortState;
    
    return [...data].sort((a, b) => {
      // Use custom sort function if provided
      if (sortFunctions[key]) {
        const result = sortFunctions[key](a, b);
        return direction === 'asc' ? result : -result;
      }

      // Default sorting logic
      const aVal = a[key];
      const bVal = b[key];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? 1 : -1;
      if (bVal == null) return direction === 'asc' ? -1 : 1;

      // Handle dates
      if (aVal instanceof Date && bVal instanceof Date) {
        const diff = aVal.getTime() - bVal.getTime();
        return direction === 'asc' ? diff : -diff;
      }

      // Handle date strings
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const aDate = Date.parse(aVal);
        const bDate = Date.parse(bVal);
        if (!isNaN(aDate) && !isNaN(bDate)) {
          const diff = aDate - bDate;
          return direction === 'asc' ? diff : -diff;
        }
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle booleans
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        const diff = (aVal ? 1 : 0) - (bVal ? 1 : 0);
        return direction === 'asc' ? diff : -diff;
      }

      // Handle strings (case-insensitive)
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr, 'hu');
      return direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortState, sortFunctions]);

  return {
    sortedData,
    sortState,
    handleSort,
    setSortState,
  };
}
