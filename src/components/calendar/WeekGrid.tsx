import { format, startOfWeek, addDays, isSameDay, getHours } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

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
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_GRID_TEMPLATE = '80px repeat(7, minmax(0, 1fr))';

export const WeekGrid = ({ currentDate, selectedDate, onSelectDate, tasks, onTaskClick }: WeekGridProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'hu' ? hu : undefined;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'pending':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      default:
        return 'bg-muted border-border';
    }
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

  return (
    <div className="w-full border rounded-lg overflow-hidden">
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
        className="grid border-b"
        style={{ gridTemplateColumns: WEEK_GRID_TEMPLATE }}
      >
        <div className="py-2 px-1 text-xs text-muted-foreground border-r text-center whitespace-nowrap">
          {t('calendar.allDay', 'Egész nap')}
        </div>
        {days.map((day, index) => {
          const dayTasks = getAllDayTasks(day);
          return (
            <div
              key={index}
              className={cn(
                "min-h-[40px] p-1",
                getColumnHighlight(index),
                getMiddleBorder(index)
              )}
            >
              {dayTasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "text-xs p-1 rounded truncate mb-1 cursor-pointer border",
                    getStatusColor(task.status)
                  )}
                  onClick={() => onTaskClick(task)}
                >
                  {task.title}
                </div>
              ))}
              {dayTasks.length > 2 && (
                <div className="text-xs text-muted-foreground">+{dayTasks.length - 2}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hourly grid - no inner scroll, uses page scroll */}
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
                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "min-h-[44px] p-0.5",
                      getColumnHighlight(dayIndex),
                      isLastHour ? getBottomBorder(dayIndex) : getMiddleBorder(dayIndex)
                    )}
                  >
                    {hourTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "text-xs p-1 rounded truncate cursor-pointer border",
                          getStatusColor(task.status)
                        )}
                        onClick={() => onTaskClick(task)}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
