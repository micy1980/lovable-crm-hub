import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, isSameDay, startOfDay } from 'date-fns';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface RecurrableItem {
  id: string;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  // For tasks
  deadline?: string | null;
  // For events
  start_time?: string;
  end_time?: string | null;
  // Other fields will be passed through
  [key: string]: any;
}

interface GeneratedOccurrence extends RecurrableItem {
  _isVirtualOccurrence: boolean;
  _originalId: string;
  _occurrenceDate: Date;
}

/**
 * Generate all occurrences of a recurring item within a date range
 */
export function generateRecurrences<T extends RecurrableItem>(
  item: T,
  rangeStart: Date,
  rangeEnd: Date
): (T & { _isVirtualOccurrence?: boolean; _originalId?: string; _occurrenceDate?: Date })[] {
  const recurrenceType = item.recurrence_type;
  const interval = item.recurrence_interval || 1;
  const recurrenceEndDate = item.recurrence_end_date ? new Date(item.recurrence_end_date) : null;
  
  // Get the base date (deadline for tasks, start_time for events)
  const baseDateStr = item.deadline || item.start_time;
  if (!baseDateStr) return [item];
  
  const baseDate = startOfDay(new Date(baseDateStr));
  
  // If no recurrence or recurrence type is 'none', return original item if in range
  if (!recurrenceType || recurrenceType === 'none') {
    const itemDate = new Date(baseDateStr);
    if (itemDate >= rangeStart && itemDate <= rangeEnd) {
      return [item];
    }
    return [];
  }

  const occurrences: (T & { _isVirtualOccurrence?: boolean; _originalId?: string; _occurrenceDate?: Date })[] = [];
  
  // Function to add interval based on recurrence type
  const addInterval = (date: Date, n: number): Date => {
    switch (recurrenceType) {
      case 'daily': return addDays(date, n * interval);
      case 'weekly': return addWeeks(date, n * interval);
      case 'monthly': return addMonths(date, n * interval);
      case 'yearly': return addYears(date, n * interval);
      default: return date;
    }
  };

  // Generate occurrences
  let currentDate = baseDate;
  let occurrenceIndex = 0;
  const maxOccurrences = 365; // Safety limit

  while (occurrenceIndex < maxOccurrences) {
    currentDate = addInterval(baseDate, occurrenceIndex);
    
    // Stop if past recurrence end date
    if (recurrenceEndDate && isAfter(currentDate, recurrenceEndDate)) {
      break;
    }
    
    // Stop if past the range we're looking at
    if (isAfter(currentDate, rangeEnd)) {
      break;
    }
    
    // Add occurrence if within range
    if (!isBefore(currentDate, rangeStart) && !isAfter(currentDate, rangeEnd)) {
      if (occurrenceIndex === 0) {
        // First occurrence is the original item
        occurrences.push({
          ...item,
          _isVirtualOccurrence: false,
          _originalId: item.id,
          _occurrenceDate: currentDate,
        });
      } else {
        // Virtual occurrences get a modified ID to prevent key conflicts
        const virtualItem = {
          ...item,
          id: `${item.id}_occ_${occurrenceIndex}`,
          _isVirtualOccurrence: true,
          _originalId: item.id,
          _occurrenceDate: currentDate,
        };
        
        // Update the date fields for virtual occurrences
        if (item.deadline) {
          const originalTime = new Date(item.deadline);
          const newDate = new Date(currentDate);
          newDate.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds());
          virtualItem.deadline = newDate.toISOString();
        }
        if (item.start_time) {
          const originalTime = new Date(item.start_time);
          const newDate = new Date(currentDate);
          newDate.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds());
          virtualItem.start_time = newDate.toISOString();
          
          // Also update end_time if present
          if (item.end_time) {
            const originalEnd = new Date(item.end_time);
            const duration = originalEnd.getTime() - originalTime.getTime();
            virtualItem.end_time = new Date(newDate.getTime() + duration).toISOString();
          }
        }
        
        occurrences.push(virtualItem);
      }
    }
    
    occurrenceIndex++;
    
    // If we haven't reached the range start yet, continue
    if (isBefore(currentDate, rangeStart)) {
      continue;
    }
  }

  return occurrences;
}

/**
 * Process an array of items and expand all recurring items within the date range
 */
export function expandRecurringItems<T extends RecurrableItem>(
  items: T[],
  rangeStart: Date,
  rangeEnd: Date
): (T & { _isVirtualOccurrence?: boolean; _originalId?: string; _occurrenceDate?: Date })[] {
  const expandedItems: (T & { _isVirtualOccurrence?: boolean; _originalId?: string; _occurrenceDate?: Date })[] = [];
  
  for (const item of items) {
    const occurrences = generateRecurrences(item, rangeStart, rangeEnd);
    expandedItems.push(...occurrences);
  }
  
  return expandedItems;
}
