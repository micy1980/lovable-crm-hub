import { format, startOfWeek, addDays, isSameDay, getHours } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useState } from 'react';
import { DraggableItem, CalendarItem } from './DraggableItem';
import { DroppableCell } from './DroppableCell';
import { Calendar } from 'lucide-react';

interface WeekGridProps {
  currentDate: Date;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  tasks: any[];
  events?: any[];
  onTaskDoubleClick: (task: any) => void;
  onEventDoubleClick?: (event: any) => void;
  onTaskMove?: (taskId: string, newDeadline: Date) => void;
  onEventMove?: (eventId: string, newStartTime: Date) => void;
  onCellDoubleClick?: (date: Date, hour?: number) => void;
  personalTaskColor?: string | null;
  personalEventColor?: string | null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_GRID_TEMPLATE = '80px repeat(7, minmax(0, 1fr))';

export const WeekGrid = ({ 
  currentDate, 
  selectedDate, 
  onSelectDate, 
  tasks, 
  events = [],
  onTaskDoubleClick, 
  onEventDoubleClick,
  onTaskMove, 
  onEventMove,
  onCellDoubleClick,
  personalTaskColor,
  personalEventColor
}: WeekGridProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'hu' ? hu : undefined;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);

  const getItemsForDateAndHour = (date: Date, hour: number): CalendarItem[] => {
    const hourTasks: CalendarItem[] = tasks
      .filter((task) => {
        if (!task.deadline || task.is_all_day) return false;
        const taskDate = new Date(task.deadline);
        return isSameDay(taskDate, date) && getHours(taskDate) === hour;
      })
      .map(task => ({
        id: task.id,
        title: task.title,
        type: 'task' as const,
        status: task.status,
        deadline: task.deadline,
        is_all_day: task.is_all_day,
        color: task.project?.task_color || (!task.project_id ? personalTaskColor : null) || null,
      }));

    const hourEvents: CalendarItem[] = events
      .filter((event) => {
        if (!event.start_time || event.is_all_day) return false;
        const eventDate = new Date(event.start_time);
        return isSameDay(eventDate, date) && getHours(eventDate) === hour;
      })
      .map(event => ({
        id: event.id,
        title: event.title,
        type: 'event' as const,
        start_time: event.start_time,
        end_time: event.end_time,
        is_all_day: event.is_all_day,
        color: event.project?.event_color || (!event.project_id ? personalEventColor : null) || null,
      }));

    return [...hourTasks, ...hourEvents];
  };

  const getAllDayItems = (date: Date): CalendarItem[] => {
    const allDayTasks: CalendarItem[] = tasks
      .filter((task) => {
        if (!task.deadline) return false;
        const taskDate = new Date(task.deadline);
        return isSameDay(taskDate, date) && task.is_all_day === true;
      })
      .map(task => ({
        id: task.id,
        title: task.title,
        type: 'task' as const,
        status: task.status,
        deadline: task.deadline,
        is_all_day: true,
        color: task.project?.task_color || (!task.project_id ? personalTaskColor : null) || null,
      }));

    const allDayEvents: CalendarItem[] = events
      .filter((event) => {
        if (!event.start_time) return false;
        const eventDate = new Date(event.start_time);
        return isSameDay(eventDate, date) && event.is_all_day === true;
      })
      .map(event => ({
        id: event.id,
        title: event.title,
        type: 'event' as const,
        start_time: event.start_time,
        end_time: event.end_time,
        is_all_day: true,
        color: event.project?.event_color || (!event.project_id ? personalEventColor : null) || null,
      }));

    return [...allDayTasks, ...allDayEvents];
  };

  // Pre-calculate day states
  const dayStates = days.map(day => ({
    isToday: isSameDay(day, new Date()),
    isSelected: selectedDate && isSameDay(day, selectedDate)
  }));

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
    const item = event.active.data.current?.item;
    if (item) {
      setActiveItem(item);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const itemId = active.id as string;
    const item = active.data.current?.item as CalendarItem;
    if (!item) return;

    const dropId = over.id as string;
    let newDate: Date;
    
    if (dropId.startsWith('week-allday-')) {
      const dateStr = dropId.replace('week-allday-', '');
      newDate = new Date(dateStr);
      newDate.setHours(9, 0, 0, 0);
    } else if (dropId.startsWith('week-')) {
      const parts = dropId.replace('week-', '').split('-');
      const hour = parseInt(parts.pop()!, 10);
      const dateStr = parts.join('-');
      newDate = new Date(dateStr);
      newDate.setHours(hour, 0, 0, 0);
    } else {
      return;
    }

    if (item.type === 'task' && onTaskMove) {
      const task = tasks.find(t => t.id === itemId);
      if (task?.deadline) {
        const originalDate = new Date(task.deadline);
        if (originalDate.getTime() === newDate.getTime()) return;
      }
      onTaskMove(itemId, newDate);
    } else if (item.type === 'event' && onEventMove) {
      const ev = events.find(e => e.id === itemId);
      if (ev?.start_time) {
        const originalDate = new Date(ev.start_time);
        if (originalDate.getTime() === newDate.getTime()) return;
      }
      onEventMove(itemId, newDate);
    }
  };

  const handleItemDoubleClick = (item: CalendarItem) => {
    if (item.type === 'task') {
      const task = tasks.find(t => t.id === item.id);
      if (task) onTaskDoubleClick(task);
    } else if (item.type === 'event' && onEventDoubleClick) {
      const event = events.find(e => e.id === item.id);
      if (event) onEventDoubleClick(event);
    }
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
              const dayItems = getAllDayItems(day);
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
                  {dayItems.slice(0, 2).map((item) => (
                    <DraggableItem
                      key={item.id}
                      item={item}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                      variant="full"
                    />
                  ))}
                  {dayItems.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{dayItems.length - 2}</div>
                  )}
                </DroppableCell>
              );
            })}
          </div>
        </div>

        {/* Hourly grid */}
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
                  const hourItems = getItemsForDateAndHour(day, hour);
                  const dropId = `week-${format(day, 'yyyy-MM-dd')}-${hour}`;
                  return (
                    <DroppableCell
                      key={dayIndex}
                      id={dropId}
                      className={cn(
                        "min-h-[44px] p-0.5 cursor-pointer",
                        getColumnHighlight(dayIndex),
                        isLastHour ? getBottomBorder(dayIndex) : getMiddleBorder(dayIndex)
                      )}
                      onDoubleClick={() => onCellDoubleClick?.(day, hour)}
                    >
                      {hourItems.map((item) => (
                        <DraggableItem
                          key={item.id}
                          item={item}
                          onDoubleClick={() => handleItemDoubleClick(item)}
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
        {activeItem && (
          <div className={cn(
            "text-xs p-2 rounded shadow-lg",
            activeItem.type === 'event' 
              ? "bg-violet-500 text-white" 
              : "bg-primary text-primary-foreground"
          )}>
            {activeItem.type === 'event' && <Calendar className="h-3 w-3 inline mr-1" />}
            {activeItem.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
