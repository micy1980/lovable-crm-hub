import { format, startOfWeek, addDays, isSameDay, getHours } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

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

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      {/* Header row with days */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
        <div className="py-3 text-center text-sm font-medium border-r" />
        {days.map((day, index) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          return (
            <div
              key={index}
              className={cn(
                "py-3 text-center text-sm font-medium border-r last:border-r-0 cursor-pointer hover:bg-accent/50 transition-colors",
                isToday && "bg-primary/15 dark:bg-primary/25 text-primary font-bold",
                isSelected && !isToday && "bg-accent"
              )}
              onClick={() => onSelectDate(day)}
            >
              {format(day, 'M. d.', { locale })} {format(day, 'EEE', { locale })}
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
        <div className="py-2 px-1 text-xs text-muted-foreground border-r text-center whitespace-nowrap">
          {t('calendar.allDay', 'Egész nap')}
        </div>
        {days.map((day, index) => {
          const dayTasks = getAllDayTasks(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={index}
              className={cn(
                "min-h-[40px] border-r last:border-r-0 p-1",
                isToday && "bg-primary/10 dark:bg-primary/20 border-l-2 border-l-primary"
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

      {/* Hourly grid */}
      <div className="max-h-[500px] overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0">
            <div className="py-2 px-1 text-xs text-muted-foreground border-r text-right pr-2">
              {String(hour).padStart(2, '0')}:00
            </div>
            {days.map((day, dayIndex) => {
              const hourTasks = getTasksForDateAndHour(day, hour);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "min-h-[44px] border-r last:border-r-0 p-0.5",
                    isToday && "bg-primary/10 dark:bg-primary/20 border-l-2 border-l-primary"
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
        ))}
      </div>
    </div>
  );
};
