import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle, GripVertical, Calendar } from 'lucide-react';

export interface CalendarItem {
  id: string;
  title: string;
  type: 'task' | 'event';
  // Task fields
  status?: string;
  deadline?: string | null;
  is_all_day?: boolean;
  // Event fields
  start_time?: string;
  end_time?: string | null;
  // Color field
  color?: string | null;
}

interface DraggableItemProps {
  item: CalendarItem;
  onDoubleClick: () => void;
  variant?: 'compact' | 'full';
  showTime?: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />;
    case 'in_progress':
      return <Clock className="h-3 w-3 text-blue-500 flex-shrink-0" />;
    case 'pending':
      return <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />;
    default:
      return null;
  }
};

// Color map for custom colors
const colorMap: Record<string, { bg: string; bgLight: string; border: string; text: string; darkBg: string; darkBorder: string; darkText: string }> = {
  blue: { bg: 'bg-blue-500', bgLight: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', darkBg: 'dark:bg-blue-900/30', darkBorder: 'dark:border-blue-700', darkText: 'dark:text-blue-300' },
  green: { bg: 'bg-green-500', bgLight: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', darkBg: 'dark:bg-green-900/30', darkBorder: 'dark:border-green-700', darkText: 'dark:text-green-300' },
  orange: { bg: 'bg-orange-500', bgLight: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', darkBg: 'dark:bg-orange-900/30', darkBorder: 'dark:border-orange-700', darkText: 'dark:text-orange-300' },
  red: { bg: 'bg-red-500', bgLight: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', darkBg: 'dark:bg-red-900/30', darkBorder: 'dark:border-red-700', darkText: 'dark:text-red-300' },
  purple: { bg: 'bg-purple-500', bgLight: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', darkBg: 'dark:bg-purple-900/30', darkBorder: 'dark:border-purple-700', darkText: 'dark:text-purple-300' },
  pink: { bg: 'bg-pink-500', bgLight: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', darkBg: 'dark:bg-pink-900/30', darkBorder: 'dark:border-pink-700', darkText: 'dark:text-pink-300' },
  cyan: { bg: 'bg-cyan-500', bgLight: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', darkBg: 'dark:bg-cyan-900/30', darkBorder: 'dark:border-cyan-700', darkText: 'dark:text-cyan-300' },
  yellow: { bg: 'bg-yellow-500', bgLight: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', darkBg: 'dark:bg-yellow-900/30', darkBorder: 'dark:border-yellow-700', darkText: 'dark:text-yellow-300' },
  indigo: { bg: 'bg-indigo-500', bgLight: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', darkBg: 'dark:bg-indigo-900/30', darkBorder: 'dark:border-indigo-700', darkText: 'dark:text-indigo-300' },
  teal: { bg: 'bg-teal-500', bgLight: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800', darkBg: 'dark:bg-teal-900/30', darkBorder: 'dark:border-teal-700', darkText: 'dark:text-teal-300' },
  violet: { bg: 'bg-violet-500', bgLight: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-800', darkBg: 'dark:bg-violet-900/30', darkBorder: 'dark:border-violet-700', darkText: 'dark:text-violet-300' },
};

const getCustomColorClass = (color: string | null | undefined): string => {
  if (!color || !colorMap[color]) return '';
  const c = colorMap[color];
  return `${c.bgLight} ${c.border} ${c.text} ${c.darkBg} ${c.darkBorder} ${c.darkText}`;
};

const getCustomColorCompact = (color: string | null | undefined): string => {
  if (!color || !colorMap[color]) return '';
  return `${colorMap[color].bg}/20 hover:${colorMap[color].bg}/30`;
};

const getTaskStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300';
    case 'in_progress':
      return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300';
    case 'pending':
      return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300';
    default:
      return 'bg-muted border-border';
  }
};

const getEventColor = () => {
  return 'bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300';
};

export const DraggableItem = ({ item, onDoubleClick, variant = 'compact', showTime }: DraggableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getTimeStr = () => {
    if (item.type === 'task' && item.deadline) {
      return new Date(item.deadline).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    }
    if (item.type === 'event' && item.start_time) {
      return new Date(item.start_time).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  };

  const timeStr = getTimeStr();

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onDoubleClick();
    }
  };

  const isEvent = item.type === 'event';
  const hasCustomColor = !!item.color;
  
  // Determine color class - custom color takes precedence
  let colorClass: string;
  let compactBgClass: string;
  
  if (hasCustomColor && item.color && colorMap[item.color]) {
    const c = colorMap[item.color];
    colorClass = getCustomColorClass(item.color);
    compactBgClass = `${c.bgLight} ${c.darkBg}`;
  } else {
    colorClass = isEvent ? getEventColor() : getTaskStatusColor(item.status || 'pending');
    compactBgClass = isEvent ? "bg-violet-500/20 hover:bg-violet-500/30" : "bg-primary/10 hover:bg-primary/20";
  }

  if (variant === 'compact') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "text-xs p-1 rounded truncate flex items-center gap-1 group",
          compactBgClass,
          isDragging && "opacity-50 z-50 shadow-lg"
        )}
      >
        <div 
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
        </div>
        <div 
          className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer"
          onDoubleClick={handleDoubleClick}
        >
          {isEvent ? (
            <Calendar className="h-3 w-3 text-violet-500 flex-shrink-0" />
          ) : (
            getStatusIcon(item.status || 'pending')
          )}
          <span className="truncate">{item.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "text-xs p-1 rounded truncate border group flex items-center gap-1",
        colorClass,
        isDragging && "opacity-50 z-50 shadow-lg"
      )}
    >
      <div 
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
      </div>
      <div 
        className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        {isEvent && <Calendar className="h-3 w-3 flex-shrink-0" />}
        {showTime && timeStr && <span className="font-medium">{timeStr}</span>}
        {showTime && timeStr && <span>-</span>}
        <span className="truncate">{item.title}</span>
      </div>
    </div>
  );
};
