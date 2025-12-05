import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, setHours, setMinutes } from 'date-fns';
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

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMove?: (taskId: string, newDeadline: Date) => void;
  onCellClick?: (date: Date) => void;
}

const WEEKDAYS_HU = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarGrid = ({ currentDate, selectedDate, onSelectDate, tasks, onTaskClick, onTaskMove, onCellClick }: CalendarGridProps) => {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'hu' ? hu : undefined;
  const weekdays = i18n.language === 'hu' ? WEEKDAYS_HU : WEEKDAYS_EN;
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => 
      task.deadline && isSameDay(new Date(task.deadline), date)
    );
  };

  // Build weeks array
  const weeks: Date[][] = [];
  let currentWeekStart = calendarStart;
  while (currentWeekStart <= calendarEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(addDays(currentWeekStart, i));
    }
    weeks.push(week);
    currentWeekStart = addDays(currentWeekStart, 7);
  }

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

    // Parse the drop target date from the droppable ID (format: "day-YYYY-MM-DD")
    const dropId = over.id as string;
    if (!dropId.startsWith('day-')) return;
    
    const dateStr = dropId.replace('day-', '');
    const newDate = new Date(dateStr);
    
    // Preserve the original time from the task (or set to 00:00 for all-day)
    if (task.deadline) {
      const originalDate = new Date(task.deadline);
      if (task.is_all_day) {
        newDate.setHours(0, 0, 0, 0);
      } else {
        newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
      }
    } else {
      // Default to 9:00 if no previous deadline
      newDate.setHours(9, 0, 0, 0);
    }
    
    // Only update if date actually changed
    if (task.deadline && isSameDay(new Date(task.deadline), newDate)) return;
    
    onTaskMove(taskId, newDate);
  };

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full border rounded-lg overflow-hidden">
        {/* Header row with weekdays */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekdays.map((day, index) => (
            <div
              key={index}
              className="py-3 text-center text-sm font-medium text-primary border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              const dayTasks = getTasksForDate(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dropId = `day-${format(day, 'yyyy-MM-dd')}`;

              return (
                <DroppableCell
                  key={`${weekIndex}-${dayIndex}`}
                  id={dropId}
                  className={cn(
                    "min-h-[120px] border-r border-b last:border-r-0 cursor-pointer transition-colors p-2",
                    !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                    isToday && "bg-primary/10 dark:bg-primary/20 ring-2 ring-inset ring-primary",
                    isSelected && !isToday && "ring-2 ring-inset ring-emerald-400 dark:ring-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10",
                    "hover:bg-accent/50"
                  )}
                  onClick={(e) => {
                    if (e.target === e.currentTarget && onCellClick) {
                      onCellClick(day);
                    } else {
                      onSelectDate(day);
                    }
                  }}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1 text-right",
                    isToday && "text-primary font-bold",
                    dayIndex === 6 && "text-red-500" // Sunday
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {dayTasks.slice(0, 3).map((task) => (
                      <DraggableTask
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task)}
                        variant="compact"
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayTasks.length - 3}
                      </div>
                    )}
                  </div>
                </DroppableCell>
              );
            })
          )}
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
