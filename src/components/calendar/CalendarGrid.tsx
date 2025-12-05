import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useState } from 'react';
import { DraggableItem, CalendarItem } from './DraggableItem';
import { DroppableCell } from './DroppableCell';
import { Calendar } from 'lucide-react';

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  tasks: any[];
  events?: any[];
  onTaskDoubleClick: (task: any) => void;
  onEventDoubleClick?: (event: any) => void;
  onTaskMove?: (taskId: string, newDeadline: Date) => void;
  onEventMove?: (eventId: string, newStartTime: Date) => void;
  onCellDoubleClick?: (date: Date) => void;
}

const WEEKDAYS_HU = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarGrid = ({ 
  currentDate, 
  selectedDate, 
  onSelectDate, 
  tasks, 
  events = [],
  onTaskDoubleClick, 
  onEventDoubleClick,
  onTaskMove, 
  onEventMove,
  onCellDoubleClick 
}: CalendarGridProps) => {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'hu' ? hu : undefined;
  const weekdays = i18n.language === 'hu' ? WEEKDAYS_HU : WEEKDAYS_EN;
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const getItemsForDate = (date: Date): CalendarItem[] => {
    const dayTasks: CalendarItem[] = tasks
      .filter((task) => task.deadline && isSameDay(new Date(task.deadline), date))
      .map(task => ({
        id: task.id,
        title: task.title,
        type: 'task' as const,
        status: task.status,
        deadline: task.deadline,
        is_all_day: task.is_all_day,
        color: task.project?.task_color || null,
      }));
    
    const dayEvents: CalendarItem[] = events
      .filter((event) => event.start_time && isSameDay(new Date(event.start_time), date))
      .map(event => ({
        id: event.id,
        title: event.title,
        type: 'event' as const,
        start_time: event.start_time,
        end_time: event.end_time,
        is_all_day: event.is_all_day,
        color: event.project?.event_color || null,
      }));

    return [...dayTasks, ...dayEvents];
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

    // Parse the drop target date from the droppable ID (format: "day-YYYY-MM-DD")
    const dropId = over.id as string;
    if (!dropId.startsWith('day-')) return;
    
    const dateStr = dropId.replace('day-', '');
    const newDate = new Date(dateStr);
    
    if (item.type === 'task') {
      if (!onTaskMove) return;
      const task = tasks.find(t => t.id === itemId);
      if (!task) return;
      
      if (task.deadline) {
        const originalDate = new Date(task.deadline);
        if (task.is_all_day) {
          newDate.setHours(0, 0, 0, 0);
        } else {
          newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
        }
      } else {
        newDate.setHours(9, 0, 0, 0);
      }
      
      if (task.deadline && isSameDay(new Date(task.deadline), newDate)) return;
      onTaskMove(itemId, newDate);
    } else if (item.type === 'event') {
      if (!onEventMove) return;
      const ev = events.find(e => e.id === itemId);
      if (!ev) return;
      
      if (ev.start_time) {
        const originalDate = new Date(ev.start_time);
        if (ev.is_all_day) {
          newDate.setHours(0, 0, 0, 0);
        } else {
          newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
        }
      } else {
        newDate.setHours(9, 0, 0, 0);
      }
      
      if (ev.start_time && isSameDay(new Date(ev.start_time), newDate)) return;
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
              const dayItems = getItemsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dropId = `day-${format(day, 'yyyy-MM-dd')}`;
              
              // Count all-day items
              const allDayTasks = dayItems.filter(item => item.type === 'task' && item.is_all_day);
              const allDayEvents = dayItems.filter(item => item.type === 'event' && item.is_all_day);
              const hasAllDayTask = allDayTasks.length > 0;
              const hasAllDayEvent = allDayEvents.length > 0;

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
                  onClick={() => onSelectDate(day)}
                  onDoubleClick={(e) => {
                    if (e.target === e.currentTarget && onCellDoubleClick) {
                      onCellDoubleClick(day);
                    }
                  }}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1 flex items-center justify-end gap-1",
                    isToday && "text-primary font-bold",
                    dayIndex === 6 && "text-red-500" // Sunday
                  )}>
                    {/* All-day indicator dots */}
                    {hasAllDayTask && (
                      <span 
                        className="w-2 h-2 rounded-full bg-primary flex-shrink-0" 
                        title={`${allDayTasks.length} egész napos feladat`} 
                      />
                    )}
                    {hasAllDayEvent && (
                      <span 
                        className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" 
                        title={`${allDayEvents.length} egész napos esemény`} 
                      />
                    )}
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {dayItems.slice(0, 3).map((item) => (
                      <DraggableItem
                        key={item.id}
                        item={item}
                        onDoubleClick={() => handleItemDoubleClick(item)}
                        variant="compact"
                      />
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayItems.length - 3}
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
