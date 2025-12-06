import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { hu, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/useUserProfile';

interface CalendarItem {
  id: string;
  title: string;
  type: 'task' | 'event';
  date: Date;
  status?: string;
  isAllDay?: boolean;
  color?: string | null;
}

// Color map for custom colors - matching DraggableItem
const colorMap: Record<string, { bg: string; textOnBg: string; border: string }> = {
  blue: { bg: 'bg-blue-500', textOnBg: 'text-white', border: 'border-blue-600' },
  green: { bg: 'bg-green-500', textOnBg: 'text-white', border: 'border-green-600' },
  orange: { bg: 'bg-orange-500', textOnBg: 'text-black', border: 'border-orange-600' },
  red: { bg: 'bg-red-500', textOnBg: 'text-white', border: 'border-red-600' },
  purple: { bg: 'bg-purple-500', textOnBg: 'text-white', border: 'border-purple-600' },
  pink: { bg: 'bg-pink-500', textOnBg: 'text-white', border: 'border-pink-600' },
  cyan: { bg: 'bg-cyan-500', textOnBg: 'text-black', border: 'border-cyan-600' },
  yellow: { bg: 'bg-yellow-500', textOnBg: 'text-black', border: 'border-yellow-600' },
  indigo: { bg: 'bg-indigo-500', textOnBg: 'text-white', border: 'border-indigo-600' },
  teal: { bg: 'bg-teal-500', textOnBg: 'text-white', border: 'border-teal-600' },
  violet: { bg: 'bg-violet-500', textOnBg: 'text-white', border: 'border-violet-600' },
};

const getColorClasses = (color: string | null | undefined, fallbackBg: string, fallbackText: string, fallbackBorder: string) => {
  if (color && colorMap[color]) {
    const c = colorMap[color];
    return `${c.bg} ${c.textOnBg} ${c.border}`;
  }
  return `${fallbackBg} ${fallbackText} ${fallbackBorder}`;
};

export const WeeklyCalendarWidget = () => {
  const { activeCompany } = useCompany();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'hu' ? hu : enUS;
  const { data: userProfile } = useUserProfile();

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: items = [] } = useQuery({
    queryKey: ['weekly-calendar-items', activeCompany?.id, weekStart.toISOString()],
    queryFn: async () => {
      if (!activeCompany) return [];

      const startStr = weekStart.toISOString();
      const endStr = weekEnd.toISOString();

      const [tasksRes, eventsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, deadline, status, is_all_day, project:projects(task_color)')
          .eq('company_id', activeCompany.id)
          .is('deleted_at', null)
          .gte('deadline', startStr)
          .lte('deadline', endStr)
          .neq('status', 'completed'),
        supabase
          .from('events')
          .select('id, title, start_time, is_all_day, project:projects(event_color)')
          .eq('company_id', activeCompany.id)
          .is('deleted_at', null)
          .gte('start_time', startStr)
          .lte('start_time', endStr),
      ]);

      const calendarItems: CalendarItem[] = [];

      if (tasksRes.data) {
        tasksRes.data.forEach((task: any) => {
          if (task.deadline) {
            // Project color takes precedence, then personal color
            const projectColor = task.project?.task_color;
            calendarItems.push({
              id: task.id,
              title: task.title,
              type: 'task',
              date: parseISO(task.deadline),
              status: task.status || 'pending',
              isAllDay: task.is_all_day || false,
              color: projectColor || null,
            });
          }
        });
      }

      if (eventsRes.data) {
        eventsRes.data.forEach((event: any) => {
          // Project color takes precedence, then personal color
          const projectColor = event.project?.event_color;
          calendarItems.push({
            id: event.id,
            title: event.title,
            type: 'event',
            date: parseISO(event.start_time),
            isAllDay: event.is_all_day || false,
            color: projectColor || null,
          });
        });
      }

      return calendarItems;
    },
    enabled: !!activeCompany,
  });

  const getItemsForDay = (day: Date) => {
    return items.filter((item) => isSameDay(item.date, day));
  };

  // Get personal colors from profile
  const personalTaskColor = userProfile?.personal_task_color || null;
  const personalEventColor = userProfile?.personal_event_color || null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('dashboard.weeklyOverview')}
          </CardTitle>
          <button
            onClick={() => navigate('/calendar')}
            className="text-sm text-primary hover:underline"
          >
            {t('dashboard.viewCalendar')}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dayItems = getItemsForDay(day);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[100px] p-1.5 rounded-md border",
                  isToday ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 text-center",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  <div>{format(day, 'EEE', { locale })}</div>
                  <div className={cn(
                    "text-sm",
                    isToday && "font-bold"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayItems.slice(0, 3).map((item) => {
                    // Use item color, or fall back to personal color, or default
                    const effectiveColor = item.color || 
                      (item.type === 'task' ? personalTaskColor : personalEventColor);
                    
                    const colorClasses = item.type === 'task'
                      ? getColorClasses(effectiveColor, 'bg-blue-600', 'text-white', 'border-blue-700')
                      : getColorClasses(effectiveColor, 'bg-violet-600', 'text-white', 'border-violet-700');

                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate('/calendar')}
                        className={cn(
                          "w-full text-left text-[10px] px-1 py-0.5 rounded truncate shadow-sm border transition-opacity hover:opacity-80",
                          colorClasses
                        )}
                        title={item.title}
                      >
                        <div className="flex items-center gap-0.5">
                          {item.type === 'task' ? (
                            <CheckCircle className="h-2.5 w-2.5 flex-shrink-0" />
                          ) : (
                            <Calendar className="h-2.5 w-2.5 flex-shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>
                      </button>
                    );
                  })}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{dayItems.length - 3} {t('dashboard.more')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
