import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth } from 'date-fns';
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

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const WEEKDAYS_HU = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarGrid = ({ currentDate, selectedDate, onSelectDate, tasks, onTaskClick }: CalendarGridProps) => {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'hu' ? hu : undefined;
  const weekdays = i18n.language === 'hu' ? WEEKDAYS_HU : WEEKDAYS_EN;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => 
      task.deadline && isSameDay(new Date(task.deadline), date)
    );
  };

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

  return (
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

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={cn(
                  "min-h-[120px] border-r border-b last:border-r-0 cursor-pointer transition-colors p-2",
                  !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  isToday && "bg-primary/10 dark:bg-primary/20 ring-2 ring-inset ring-primary",
                  isSelected && !isToday && "ring-2 ring-inset ring-emerald-400 dark:ring-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10",
                  "hover:bg-accent/50"
                )}
                onClick={() => onSelectDate(day)}
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
                    <div
                      key={task.id}
                      className="text-xs p-1 rounded bg-primary/10 truncate flex items-center gap-1 hover:bg-primary/20 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                    >
                      {getStatusIcon(task.status)}
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayTasks.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
