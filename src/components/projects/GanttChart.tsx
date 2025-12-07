import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWithinInterval, isSameDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: string | null;
  projectId?: string | null;
  projectName?: string | null;
  projectCode?: string | null;
  responsibleUser?: string | null;
  color: string;
}

interface GanttChartProps {
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
}

const STATUS_COLORS: Record<string, string> = {
  'new': 'bg-blue-500',
  'pending': 'bg-blue-500',
  'in_progress': 'bg-yellow-500',
  'review': 'bg-purple-500',
  'done': 'bg-green-500',
  'completed': 'bg-green-500',
  'cancelled': 'bg-gray-500',
};

export const GanttChart = ({ projectId, startDate: propStartDate, endDate: propEndDate }: GanttChartProps) => {
  const { activeCompany } = useCompany();

  // Default to showing 2 months before and after current date
  const defaultStartDate = subMonths(startOfMonth(new Date()), 1);
  const defaultEndDate = addMonths(endOfMonth(new Date()), 2);
  
  const chartStartDate = propStartDate || defaultStartDate;
  const chartEndDate = propEndDate || defaultEndDate;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['gantt-tasks', activeCompany?.id, projectId],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      let query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          deadline,
          created_at,
          project_id,
          responsible_user_id,
          project:projects(name, code),
          responsible_user:profiles!tasks_responsible_user_id_fkey(full_name, email)
        `)
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .not('deadline', 'is', null)
        .order('deadline', { ascending: true });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id,
  });

  const ganttTasks: GanttTask[] = useMemo(() => {
    return tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      startDate: new Date(task.created_at),
      endDate: new Date(task.deadline),
      status: task.status,
      projectId: task.project_id,
      projectName: task.project?.name,
      projectCode: task.project?.code,
      responsibleUser: task.responsible_user?.full_name || task.responsible_user?.email,
      color: STATUS_COLORS[task.status || 'new'] || 'bg-blue-500',
    }));
  }, [tasks]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: chartStartDate, end: chartEndDate });
  }, [chartStartDate, chartEndDate]);

  const totalDays = days.length;
  const dayWidth = 40; // pixels per day
  const rowHeight = 36;

  const getTaskPosition = (task: GanttTask) => {
    const taskStart = task.startDate < chartStartDate ? chartStartDate : task.startDate;
    const taskEnd = task.endDate > chartEndDate ? chartEndDate : task.endDate;
    
    const startOffset = differenceInDays(taskStart, chartStartDate);
    const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);
    
    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth - 4,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (ganttTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nincsenek feladatok a megjelenítéshez
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <ScrollArea className="w-full">
        <div className="min-w-max">
          {/* Header with dates */}
          <div className="flex border-b bg-muted/50 sticky top-0 z-10">
            {/* Task name column */}
            <div className="w-64 flex-shrink-0 p-2 border-r font-semibold text-sm bg-muted">
              Feladat
            </div>
            
            {/* Date columns */}
            <div className="flex" style={{ width: totalDays * dayWidth }}>
              {days.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const isFirstOfMonth = day.getDate() === 1;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex-shrink-0 text-center text-xs border-r py-1",
                      isToday && "bg-primary/10",
                      isWeekend && "bg-muted/50",
                      isFirstOfMonth && "border-l-2 border-l-primary"
                    )}
                    style={{ width: dayWidth }}
                  >
                    <div className="font-medium">
                      {isFirstOfMonth ? format(day, 'MMM', { locale: hu }) : ''}
                    </div>
                    <div className={cn(isToday && "font-bold text-primary")}>
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task rows */}
          {ganttTasks.map((task) => {
            const position = getTaskPosition(task);
            const isVisible = isWithinInterval(task.endDate, { start: chartStartDate, end: chartEndDate }) ||
                             isWithinInterval(task.startDate, { start: chartStartDate, end: chartEndDate }) ||
                             (task.startDate <= chartStartDate && task.endDate >= chartEndDate);
            
            return (
              <div key={task.id} className="flex border-b hover:bg-muted/30" style={{ height: rowHeight }}>
                {/* Task name column */}
                <div className="w-64 flex-shrink-0 p-2 border-r text-sm truncate flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate cursor-default">
                        {task.projectCode ? `[${task.projectCode}] ` : ''}
                        {task.title}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">{task.title}</p>
                        {task.projectName && <p className="text-xs">Projekt: {task.projectName}</p>}
                        {task.responsibleUser && <p className="text-xs">Felelős: {task.responsibleUser}</p>}
                        <p className="text-xs">
                          {format(task.startDate, 'yyyy.MM.dd')} - {format(task.endDate, 'yyyy.MM.dd')}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                {/* Gantt bar area */}
                <div className="relative flex-1" style={{ width: totalDays * dayWidth }}>
                  {/* Today line */}
                  {days.map((day, index) => {
                    if (isSameDay(day, new Date())) {
                      return (
                        <div
                          key={`today-${index}`}
                          className="absolute top-0 bottom-0 w-0.5 bg-primary z-5"
                          style={{ left: index * dayWidth + dayWidth / 2 }}
                        />
                      );
                    }
                    return null;
                  })}
                  
                  {/* Task bar */}
                  {isVisible && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute top-1 bottom-1 rounded cursor-pointer transition-opacity hover:opacity-80",
                            task.color
                          )}
                          style={{
                            left: position.left,
                            width: Math.max(position.width, 20),
                          }}
                        >
                          <span className="px-1 text-xs text-white truncate block leading-6">
                            {task.title}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{task.title}</p>
                          {task.projectName && <p className="text-xs">Projekt: {task.projectName}</p>}
                          {task.responsibleUser && <p className="text-xs">Felelős: {task.responsibleUser}</p>}
                          <p className="text-xs">
                            {format(task.startDate, 'yyyy.MM.dd')} - {format(task.endDate, 'yyyy.MM.dd')}
                          </p>
                          <p className="text-xs">Státusz: {task.status}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
