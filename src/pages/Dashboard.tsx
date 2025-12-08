import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, TrendingUp, Users, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LicenseStatusWidget } from '@/components/dashboard/LicenseStatusWidget';
import { TasksWidget } from '@/components/dashboard/TasksWidget';
import { ProjectsChart } from '@/components/dashboard/ProjectsChart';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import { WeeklyCalendarWidget } from '@/components/dashboard/WeeklyCalendarWidget';
import { DashboardCustomizer } from '@/components/dashboard/DashboardCustomizer';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

interface SortableWidgetProps {
  id: string;
  width: string;
  children: React.ReactNode;
  title: string;
}

const SortableWidget = ({ id, width, children, title }: SortableWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getWidthClass = () => {
    switch (width) {
      case 'full': return 'col-span-full';
      case 'third': return 'col-span-1';
      default: return 'col-span-1 md:col-span-2';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        getWidthClass(),
        isDragging && 'opacity-50 z-50',
        'relative group'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-background/80 rounded p-1"
        title="Húzd az átrendezéshez"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
};

const Dashboard = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();
  const { widgets, reorderWidgets } = useDashboardWidgets();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: projectStats } = useQuery({
    queryKey: ['project-stats', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { total: 0, byStatus: {} };
      const { data, error } = await supabase
        .from('projects')
        .select('status')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);
      if (error) throw error;
      const byStatus = data.reduce((acc: any, project) => {
        acc[project.status || 'unknown'] = (acc[project.status || 'unknown'] || 0) + 1;
        return acc;
      }, {});
      return { total: data.length, byStatus };
    },
    enabled: !!activeCompany,
  });

  const { data: salesStats } = useQuery({
    queryKey: ['sales-stats', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { total: 0, byStatus: {} };
      const { data, error } = await supabase
        .from('sales')
        .select('status')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);
      if (error) throw error;
      const byStatus = data.reduce((acc: any, sale) => {
        acc[sale.status || 'unknown'] = (acc[sale.status || 'unknown'] || 0) + 1;
        return acc;
      }, {});
      return { total: data.length, byStatus };
    },
    enabled: !!activeCompany,
  });

  const { data: partnersCount } = useQuery({
    queryKey: ['partners-count', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return 0;
      const { count, error } = await supabase
        .from('partners')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeCompany,
  });

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t('dashboard.noCompanySelected')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const visibleWidgets = widgets.filter(w => w.is_visible);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = visibleWidgets.findIndex((w) => w.id === active.id);
      const newIndex = visibleWidgets.findIndex((w) => w.id === over.id);
      const newOrder = arrayMove(visibleWidgets, oldIndex, newIndex);
      reorderWidgets(newOrder.map((w) => w.id));
    }
  };

  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case 'license_status':
        return <LicenseStatusWidget />;
      case 'tasks':
        return <TasksWidget />;
      case 'weekly_calendar':
        return <WeeklyCalendarWidget />;
      case 'projects_chart':
        return projectStats?.byStatus && Object.keys(projectStats.byStatus).length > 0 
          ? <ProjectsChart data={projectStats.byStatus} />
          : <Card className="h-full flex items-center justify-center text-muted-foreground">Nincs projekt adat</Card>;
      case 'sales_chart':
        return salesStats?.byStatus && Object.keys(salesStats.byStatus).length > 0
          ? <SalesChart data={salesStats.byStatus} />
          : <Card className="h-full flex items-center justify-center text-muted-foreground">Nincs értékesítés adat</Card>;
      case 'recent_activity':
        return <RecentActivityWidget />;
      default:
        return null;
    }
  };

  const activeWidget = activeId ? visibleWidgets.find(w => w.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.welcome', { companyName: activeCompany.name })}
          </p>
        </div>
        <DashboardCustomizer />
      </div>

      {/* Summary cards - always visible, not draggable */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalProjects')}</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.salesOpportunities')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesStats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalPartners')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partnersCount || 0}</div>
          </CardContent>
        </Card>
        {visibleWidgets.find(w => w.id === 'license_status') && <LicenseStatusWidget />}
      </div>

      {/* Customizable widgets with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.filter(w => w.id !== 'license_status').map(w => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-4 md:grid-cols-4">
            {visibleWidgets
              .filter(w => w.id !== 'license_status')
              .map(widget => (
                <SortableWidget
                  key={widget.id}
                  id={widget.id}
                  width={widget.width}
                  title={widget.title}
                >
                  {renderWidgetContent(widget.id)}
                </SortableWidget>
              ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget ? (
            <div className="opacity-80 shadow-lg">
              {renderWidgetContent(activeWidget.id)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Dashboard;

