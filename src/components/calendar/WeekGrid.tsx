import { format, startOfWeek, addDays, isSameDay, getHours } from 'date-fns';
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
}

interface WeekGridProps {
  currentDate: Date;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMove?: (taskId: string, newDeadline: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_GRID_TEMPLATE = '80px repeat(7, minmax(0, 1fr))';

export const WeekGrid = ({ currentDate, selectedDate, onSelectDate, tasks, onTaskClick, onTaskMove }: WeekGridProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'hu' ? hu : undefined;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const getTasksForDateAndHour = (date: Date, hour: number) => {
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      return isSameDay(taskDate, date) && getHours(taskDate) === hour;
    });
  };

  const getAllDayTasks = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      return isSameDay(taskDate, date);
    });
  };

  // Pre-calculate day states
  const dayStates = days.map(day => ({
    isToday: isSameDay(day, new Date()),
    isSelected: selectedDate && isSameDay(day, selectedDate)
  }));

  // Get highlight classes for a day column cell
  const getColumnHighlight = (index: number) => {
    const { isToday, isSelected } = dayStates[index];
    if (isSelected && !isToday) {
      return 'bg-emerald-500/20 dark:bg-emerald-500/15';
    }
    if (isToday) {
      return 'bg-primary/20 dark:bg-primary/15';
    }
    return '';
  };

  // Get border classes for header cells
  const getHeaderBorder = (index: number) => {
    const { isToday, isSelected } = dayStates[index];
    if (isSelected && !isToday) {
      return 'border-2 border-emerald-500 border-b-0';
    }
    if (isToday) {
      return 'border-2 border-primary border-b-0';
    }
    return 'border border-transparent border-b-0';
  };

  // Get border classes for middle cells (all-day and hourly)
  const getMiddleBorder = (index: number) => {
    const { isToday, isSelected } = dayStates[index];
    if (isSelected && !isToday) {
      return 'border-x-2 border-emerald-500';
    }
    if (isToday) {
      return 'border-x-2 border-primary';
    }
    return 'border-x border-transparent';
  };

  // Get border classes for last row cells
  const getBottomBorder = (index: number) => {
    const { isToday, isSelected } = dayStates[index];
    if (isSelected && !isToday) {
      return 'border-x-2 border-b-2 border-emerald-500';
    }
    if (isToday) {
      return 'border-x-2 border-b-2 border-primary';
    }
    return 'border-x border-b border-transparent';
  };

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
    // Format: "week-YYYY-MM-DD-HH" for hourly cells or "week-allday-YYYY-MM-DD" for all-day
    const dropId = over.id as string;
    
    let newDate: Date;
    
    if (dropId.startsWith('week-allday-')) {
      const dateStr = dropId.replace('week-allday-', '');
      newDate = new Date(dateStr);
      // Keep original time or default to 9:00
      if (task.deadline) {
        const originalDate = new Date(task.deadline);
        newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
      } else {
        newDate.setHours(9, 0, 0, 0);
      }
    } else if (dropId.startsWith('week-')) {
      const parts = dropId.replace('week-', '').split('-');
      const hour = parseInt(parts.pop()!, 10);
      const dateStr = parts.join('-');
      newDate = new Date(dateStr);
      newDate.setHours(hour, 0, 0, 0);
    } else {
      return;
    }
    
    // Only update if date/time actually changed
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
          {/* Header row with days */}
          <div 
            className="grid bg-muted/30 border-b"
            style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
          >
            <div className="py-3 text-center text-sm font-medium border-r" />
            {days.map((day, index) => (
              <div
                key={index}
                className={cn(
                  "py-3 text-center text-sm font-medium cursor-pointer hover:bg-accent/50 transition-colors",
                  getColumnHighlight(index),
                  getHeaderBorder(index),
                  dayStates[index].isToday && "text-primary font-bold",
                  dayStates[index].isSelected && !dayStates[index].isToday && "text-emerald-600 dark:text-emerald-400 font-semibold"
                )}
                onClick={() => onSelectDate(day)}
              >
                {format(day, 'M. d.', { locale })} {format(day, 'EEE', { locale })}
              </div>
            ))}
          </div>

          {/* All-day row */}
          <div 
            className="grid border-b bg-background"
            style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
          >
            <div className="py-2 px-1 text-xs text-muted-foreground border-r text-center whitespace-nowrap">
              {t('calendar.allDay', 'Egész nap')}
            </div>
            {days.map((day, index) => {
              const dayTasks = getAllDayTasks(day);
              const dropId = `week-allday-${format(day, 'yyyy-MM-dd')}`;
              return (
                <DroppableCell
                  key={index}
                  id={dropId}
                  className={cn(
                    "min-h-[40px] p-1",
                    getColumnHighlight(index),
                    getMiddleBorder(index)
                  )}
                >
                  {dayTasks.slice(0, 2).map((task) => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      variant="full"
                    />
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{dayTasks.length - 2}</div>
                  )}
                </DroppableCell>
              );
            })}
          </div>
        </div>

        {/* Hourly grid - scrollable content */}
        <div>
          {HOURS.map((hour, hourIndex) => {
            const isLastHour = hourIndex === HOURS.length - 1;
            return (
              <div 
                key={hour} 
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
              >
                <div className="py-2 px-1 text-xs text-muted-foreground border-r text-right pr-2">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {days.map((day, dayIndex) => {
                  const hourTasks = getTasksForDateAndHour(day, hour);
                  const dropId = `week-${format(day, 'yyyy-MM-dd')}-${hour}`;
                  return (
                    <DroppableCell
                      key={dayIndex}
                      id={dropId}
                      className={cn(
                        "min-h-[44px] p-0.5",
                        getColumnHighlight(dayIndex),
                        isLastHour ? getBottomBorder(dayIndex) : getMiddleBorder(dayIndex)
                      )}
                    >
                      {hourTasks.map((task) => (
                        <DraggableTask
                          key={task.id}
                          task={task}
                          onClick={() => onTaskClick(task)}
                          variant="full"
                        />
                      ))}
                    </DroppableCell>
                  );
                })}
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
