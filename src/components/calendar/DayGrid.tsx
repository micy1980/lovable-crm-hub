import { format, isSameDay, getHours } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useState } from 'react';
import { DraggableTask } from './DraggableTask';
import { DroppableCell } from './DroppableCell';

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  is_all_day?: boolean;
}

interface DayGridProps {
  currentDate: Date;
  selectedDate?: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMove?: (taskId: string, newDeadline: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_GRID_TEMPLATE = '80px minmax(0, 1fr)';

export const DayGrid = ({ currentDate, selectedDate, tasks, onTaskClick, onTaskMove }: DayGridProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'hu' ? hu : undefined;
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const getTasksForHour = (hour: number) => {
    return tasks.filter((task) => {
      if (!task.deadline || task.is_all_day) return false;
      const taskDate = new Date(task.deadline);
      return isSameDay(taskDate, currentDate) && getHours(taskDate) === hour;
    });
  };

  // All-day row shows tasks marked as is_all_day
  const getAllDayTasks = () => {
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      return isSameDay(taskDate, currentDate) && task.is_all_day === true;
    });
  };

  const isToday = isSameDay(currentDate, new Date());
  const isSelected = selectedDate && isSameDay(currentDate, selectedDate);
  const allDayTasks = getAllDayTasks();

  // Day view: only highlight the HEADER, not the body cells
  const headerHighlight = isSelected
    ? 'bg-emerald-500/20 dark:bg-emerald-500/15 ring-2 ring-inset ring-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
    : isToday
      ? 'bg-primary/20 dark:bg-primary/15 ring-2 ring-inset ring-primary text-primary font-bold'
      : '';

  const handleDragStart = (event: any) => {
    const task = event.active.data.current?.task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    
    if (!over || !onTaskMove) return;
    
    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Parse the drop target from the droppable ID
    // Format: "day-YYYY-MM-DD-HH" for hourly cells or "day-allday-YYYY-MM-DD"
    const dropId = over.id as string;
    
    let newDate: Date;
    
    if (dropId.startsWith('day-allday-')) {
      const dateStr = dropId.replace('day-allday-', '');
      newDate = new Date(dateStr);
      // Keep original time or default to 9:00
      if (task.deadline) {
        const originalDate = new Date(task.deadline);
        newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
      } else {
        newDate.setHours(9, 0, 0, 0);
      }
    } else if (dropId.startsWith('day-')) {
      const parts = dropId.replace('day-', '').split('-');
      const hour = parseInt(parts.pop()!, 10);
      const dateStr = parts.join('-');
      newDate = new Date(dateStr);
      newDate.setHours(hour, 0, 0, 0);
    } else {
      return;
    }
    
    // Only update if time actually changed
    if (task.deadline) {
      const originalDate = new Date(task.deadline);
      if (originalDate.getTime() === newDate.getTime()) return;
    }
    
    onTaskMove(taskId, newDate);
  };

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full border rounded-lg overflow-hidden max-h-[calc(100vh-280px)] overflow-y-auto relative">
        {/* Sticky header container */}
        <div className="sticky top-0 z-20 bg-background">
          {/* Header - only this gets highlighted */}
          <div 
            className="grid border-b bg-muted/30"
            style={{ gridTemplateColumns: DAY_GRID_TEMPLATE }}
          >
            <div className="py-3 text-center text-sm font-medium border-r"></div>
            <div className={cn(
              "py-3 text-center text-sm font-medium",
              headerHighlight
            )}>
              {format(currentDate, 'yyyy. MMMM d. EEEE', { locale })}
            </div>
          </div>

          {/* All-day row - neutral background */}
          <div 
            className="grid border-b bg-background"
            style={{ gridTemplateColumns: DAY_GRID_TEMPLATE }}
          >
            <div className="py-2 px-1 text-xs text-muted-foreground border-r text-center">
              {t('calendar.allDay', 'Egész nap')}
            </div>
            <DroppableCell
              id={`day-allday-${format(currentDate, 'yyyy-MM-dd')}`}
              className="min-h-[40px] p-1"
            >
              {allDayTasks.slice(0, 3).map((task) => (
                <DraggableTask
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  variant="full"
                />
              ))}
              {allDayTasks.length > 3 && (
                <span className="text-xs text-muted-foreground">+{allDayTasks.length - 3}</span>
              )}
            </DroppableCell>
          </div>
        </div>

        {/* Hourly grid - scrollable content */}
        <div>
          {HOURS.map((hour) => {
            const hourTasks = getTasksForHour(hour);
            const dropId = `day-${format(currentDate, 'yyyy-MM-dd')}-${hour}`;
            return (
              <div 
                key={hour} 
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: DAY_GRID_TEMPLATE }}
              >
                <div className="py-2 px-1 text-xs text-muted-foreground border-r text-right pr-2">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <DroppableCell
                  id={dropId}
                  className="min-h-[44px] p-0.5"
                >
                  {hourTasks.map((task) => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      variant="full"
                      showTime
                    />
                  ))}
                </DroppableCell>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="text-xs p-2 rounded bg-primary text-primary-foreground shadow-lg">
            {activeTask.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
