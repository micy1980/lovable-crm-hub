import { format, isSameDay, getHours } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useState } from 'react';
import { DraggableItem, CalendarItem } from './DraggableItem';
import { DroppableCell } from './DroppableCell';
import { Calendar } from 'lucide-react';

interface DayGridProps {
  currentDate: Date;
  selectedDate?: Date;
  tasks: any[];
  events?: any[];
  onTaskDoubleClick: (task: any) => void;
  onEventDoubleClick?: (event: any) => void;
  onTaskMove?: (taskId: string, newDeadline: Date) => void;
  onEventMove?: (eventId: string, newStartTime: Date) => void;
  onCellDoubleClick?: (date: Date, hour?: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_GRID_TEMPLATE = '80px minmax(0, 1fr)';

export const DayGrid = ({ 
  currentDate, 
  selectedDate, 
  tasks, 
  events = [],
  onTaskDoubleClick, 
  onEventDoubleClick,
  onTaskMove, 
  onEventMove,
  onCellDoubleClick 
}: DayGridProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'hu' ? hu : undefined;
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);

  const getItemsForHour = (hour: number): CalendarItem[] => {
    const hourTasks: CalendarItem[] = tasks
      .filter((task) => {
        if (!task.deadline || task.is_all_day) return false;
        const taskDate = new Date(task.deadline);
        return isSameDay(taskDate, currentDate) && getHours(taskDate) === hour;
      })
      .map(task => ({
        id: task.id,
        title: task.title,
        type: 'task' as const,
        status: task.status,
        deadline: task.deadline,
        is_all_day: task.is_all_day,
        color: task.project?.task_color || null,
      }));

    const hourEvents: CalendarItem[] = events
      .filter((event) => {
        if (!event.start_time || event.is_all_day) return false;
        const eventDate = new Date(event.start_time);
        return isSameDay(eventDate, currentDate) && getHours(eventDate) === hour;
      })
      .map(event => ({
        id: event.id,
        title: event.title,
        type: 'event' as const,
        start_time: event.start_time,
        end_time: event.end_time,
        is_all_day: event.is_all_day,
        color: event.project?.event_color || null,
      }));

    return [...hourTasks, ...hourEvents];
  };

  const getAllDayItems = (): CalendarItem[] => {
    const allDayTasks: CalendarItem[] = tasks
      .filter((task) => {
        if (!task.deadline) return false;
        const taskDate = new Date(task.deadline);
        return isSameDay(taskDate, currentDate) && task.is_all_day === true;
      })
      .map(task => ({
        id: task.id,
        title: task.title,
        type: 'task' as const,
        status: task.status,
        deadline: task.deadline,
        is_all_day: true,
        color: task.project?.task_color || null,
      }));

    const allDayEvents: CalendarItem[] = events
      .filter((event) => {
        if (!event.start_time) return false;
        const eventDate = new Date(event.start_time);
        return isSameDay(eventDate, currentDate) && event.is_all_day === true;
      })
      .map(event => ({
        id: event.id,
        title: event.title,
        type: 'event' as const,
        start_time: event.start_time,
        end_time: event.end_time,
        is_all_day: true,
        color: event.project?.event_color || null,
      }));

    return [...allDayTasks, ...allDayEvents];
  };

  const isToday = isSameDay(currentDate, new Date());
  const isSelected = selectedDate && isSameDay(currentDate, selectedDate);
  const allDayItems = getAllDayItems();

  const headerHighlight = isSelected
    ? 'bg-emerald-500/20 dark:bg-emerald-500/15 ring-2 ring-inset ring-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
    : isToday
      ? 'bg-primary/20 dark:bg-primary/15 ring-2 ring-inset ring-primary text-primary font-bold'
      : '';

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
    
    if (dropId.startsWith('day-allday-')) {
      const dateStr = dropId.replace('day-allday-', '');
      newDate = new Date(dateStr);
      newDate.setHours(9, 0, 0, 0);
    } else if (dropId.startsWith('day-')) {
      const parts = dropId.replace('day-', '').split('-');
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
          {/* Header */}
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

          {/* All-day row */}
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
              {allDayItems.slice(0, 3).map((item) => (
                <DraggableItem
                  key={item.id}
                  item={item}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  variant="full"
                />
              ))}
              {allDayItems.length > 3 && (
                <span className="text-xs text-muted-foreground">+{allDayItems.length - 3}</span>
              )}
            </DroppableCell>
          </div>
        </div>

        {/* Hourly grid */}
        <div>
          {HOURS.map((hour) => {
            const hourItems = getItemsForHour(hour);
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
                  className="min-h-[44px] p-0.5 cursor-pointer"
                  onDoubleClick={() => onCellDoubleClick?.(currentDate, hour)}
                >
                  {hourItems.map((item) => (
                    <DraggableItem
                      key={item.id}
                      item={item}
                      onDoubleClick={() => handleItemDoubleClick(item)}
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
