import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle, GripVertical } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
}

interface DraggableTaskProps {
  task: Task;
  onClick: () => void;
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

const getStatusColor = (status: string) => {
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

export const DraggableTask = ({ task, onClick, variant = 'compact', showTime }: DraggableTaskProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const timeStr = task.deadline 
    ? new Date(task.deadline).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
    : '';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onClick();
    }
  };

  if (variant === 'compact') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "text-xs p-1 rounded bg-primary/10 truncate flex items-center gap-1 hover:bg-primary/20 group",
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
          onClick={handleClick}
        >
          {getStatusIcon(task.status)}
          <span className="truncate">{task.title}</span>
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
        getStatusColor(task.status),
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
        onClick={handleClick}
      >
        {showTime && timeStr && <span className="font-medium">{timeStr}</span>}
        {showTime && timeStr && <span>-</span>}
        <span className="truncate">{task.title}</span>
      </div>
    </div>
  );
};
