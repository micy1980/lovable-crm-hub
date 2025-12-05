import { format, isSameDay, getHours } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
}

interface DayGridProps {
  currentDate: Date;
  selectedDate?: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_GRID_TEMPLATE = '80px minmax(0, 1fr)';

export const DayGrid = ({ currentDate, selectedDate, tasks, onTaskClick }: DayGridProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'hu' ? hu : undefined;

  const getTasksForHour = (hour: number) => {
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      return isSameDay(taskDate, currentDate) && getHours(taskDate) === hour;
    });
  };

  const getAllDayTasks = () => {
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      return isSameDay(new Date(task.deadline), currentDate);
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

  const isToday = isSameDay(currentDate, new Date());
  const isSelected = selectedDate && isSameDay(currentDate, selectedDate);
  const allDayTasks = getAllDayTasks();

  // Day view: only highlight the HEADER, not the body cells
  const headerHighlight = isSelected
    ? 'bg-emerald-500/20 dark:bg-emerald-500/15 ring-2 ring-inset ring-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
    : isToday
      ? 'bg-primary/20 dark:bg-primary/15 ring-2 ring-inset ring-primary text-primary font-bold'
      : '';

  return (
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
          <div className="min-h-[40px] p-1">
            {allDayTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className={cn(
                  "text-xs p-1 rounded truncate mb-1 cursor-pointer border inline-block mr-2",
                  getStatusColor(task.status)
                )}
                onClick={() => onTaskClick(task)}
              >
                {task.title}
              </div>
            ))}
            {allDayTasks.length > 3 && (
              <span className="text-xs text-muted-foreground">+{allDayTasks.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      {/* Hourly grid - scrollable content */}
      <div>
        {HOURS.map((hour) => {
          const hourTasks = getTasksForHour(hour);
          return (
            <div 
              key={hour} 
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns: DAY_GRID_TEMPLATE }}
            >
              <div className="py-2 px-1 text-xs text-muted-foreground border-r text-right pr-2">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="min-h-[44px] p-0.5">
                {hourTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "text-xs p-1 rounded truncate cursor-pointer border mb-1",
                      getStatusColor(task.status)
                    )}
                    onClick={() => onTaskClick(task)}
                  >
                    {format(new Date(task.deadline!), 'HH:mm', { locale })} - {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
