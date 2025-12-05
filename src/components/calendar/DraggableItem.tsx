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
  const colorClass = isEvent ? getEventColor() : getTaskStatusColor(item.status || 'pending');

  if (variant === 'compact') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "text-xs p-1 rounded truncate flex items-center gap-1 group",
          isEvent 
            ? "bg-violet-500/20 hover:bg-violet-500/30" 
            : "bg-primary/10 hover:bg-primary/20",
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
