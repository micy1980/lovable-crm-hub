import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CheckSquare,
  Clock,
  Filter,
  FolderOpen,
  Briefcase,
  User,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { BulkActionsToolbar } from '@/components/shared/BulkActionsToolbar';
import { BulkDeleteDialog } from '@/components/shared/BulkDeleteDialog';
import { useMyItems } from '@/hooks/useEvents';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableRow, TableCell } from '@/components/ui/table';
import { TaskDialog } from '@/components/projects/TaskDialog';
import { EventDialog } from '@/components/events/EventDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';
import { useSortableData } from '@/hooks/useSortableData';

const colorMap: Record<string, { bg: string; textOnBg: string }> = {
  red: { bg: 'bg-red-500', textOnBg: 'text-white' },
  blue: { bg: 'bg-blue-500', textOnBg: 'text-white' },
  green: { bg: 'bg-green-500', textOnBg: 'text-white' },
  yellow: { bg: 'bg-yellow-500', textOnBg: 'text-black' },
  purple: { bg: 'bg-purple-500', textOnBg: 'text-white' },
  pink: { bg: 'bg-pink-500', textOnBg: 'text-white' },
  indigo: { bg: 'bg-indigo-500', textOnBg: 'text-white' },
  orange: { bg: 'bg-orange-500', textOnBg: 'text-black' },
  teal: { bg: 'bg-teal-500', textOnBg: 'text-white' },
  cyan: { bg: 'bg-cyan-500', textOnBg: 'text-black' },
};

type FilterType = 'all' | 'personal' | 'project';

const TASKS_STORAGE_KEY = 'my-items-tasks-columns';
const EVENTS_STORAGE_KEY = 'my-items-events-columns';

export default function MyItems() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { data, isLoading } = useMyItems();
  const { data: userProfile } = useUserProfile();
  const queryClient = useQueryClient();

  const personalTaskColor = userProfile?.personal_task_color || null;
  const personalEventColor = userProfile?.personal_event_color || null;

  const getItemColor = (item: any, type: 'task' | 'event') => {
    if (item.project_id && item.project) {
      const projectColor = type === 'task' ? item.project.task_color : item.project.event_color;
      if (projectColor && colorMap[projectColor]) {
        return colorMap[projectColor];
      }
    }
    if (!item.project_id && !item.sales_id) {
      const personalColor = type === 'task' ? personalTaskColor : personalEventColor;
      if (personalColor && colorMap[personalColor]) {
        return colorMap[personalColor];
      }
    }
    return null;
  };

  const [filter, setFilter] = useState<FilterType>('all');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'task' | 'event'; id: string } | null>(null);

  // Task column settings
  const taskColumnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'select', label: 'Kijelölés', defaultVisible: true, defaultWidth: 50, required: true },
    { key: 'title', label: t('tasks.title'), defaultVisible: true, defaultWidth: 200, required: true, sortable: true },
    { key: 'status', label: t('tasks.statusLabel'), defaultVisible: true, defaultWidth: 120, sortable: true },
    { key: 'type', label: t('myItems.type'), defaultVisible: true, defaultWidth: 150, sortable: true },
    { key: 'partner', label: t('partners.title'), defaultVisible: true, defaultWidth: 150, sortable: true },
    { key: 'deadline', label: t('tasks.deadline'), defaultVisible: true, defaultWidth: 160, sortable: true },
  ], [t]);

  const taskColumns = useColumnSettings({ storageKey: TASKS_STORAGE_KEY, columns: taskColumnConfigs });

  // Event column settings
  const eventColumnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'select', label: 'Kijelölés', defaultVisible: true, defaultWidth: 50, required: true },
    { key: 'title', label: t('events.title'), defaultVisible: true, defaultWidth: 200, required: true, sortable: true },
    { key: 'type', label: t('myItems.type'), defaultVisible: true, defaultWidth: 150, sortable: true },
    { key: 'partner', label: t('partners.title'), defaultVisible: true, defaultWidth: 150, sortable: true },
    { key: 'startTime', label: t('events.startTime'), defaultVisible: true, defaultWidth: 180, sortable: true },
    { key: 'location', label: t('events.location'), defaultVisible: true, defaultWidth: 150, sortable: true },
  ], [t]);

  const eventColumns = useColumnSettings({ storageKey: EVENTS_STORAGE_KEY, columns: eventColumnConfigs });

  const preFilteredTasks = (data?.tasks || []).filter((task: any) => {
    if (filter === 'personal') return !task.project_id && !task.sales_id;
    if (filter === 'project') return task.project_id || task.sales_id;
    return true;
  });

  const preFilteredEvents = (data?.events || []).filter((event: any) => {
    if (filter === 'personal') return !event.project_id && !event.sales_id;
    if (filter === 'project') return event.project_id || event.sales_id;
    return true;
  });

  // Sort functions for tasks
  const taskSortFunctions = useMemo(() => ({
    title: (a: any, b: any) => (a.title || '').localeCompare(b.title || '', 'hu'),
    status: (a: any, b: any) => (a.status || '').localeCompare(b.status || '', 'hu'),
    type: (a: any, b: any) => {
      const getType = (item: any) => item.project_id ? 'project' : item.sales_id ? 'sales' : 'personal';
      return getType(a).localeCompare(getType(b), 'hu');
    },
    partner: (a: any, b: any) => (a.partner?.name || '').localeCompare(b.partner?.name || '', 'hu'),
    deadline: (a: any, b: any) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    },
  }), []);

  const { sortedData: filteredTasks, sortState: taskSortState, handleSort: handleTaskSort } = useSortableData({
    data: preFilteredTasks,
    sortFunctions: taskSortFunctions,
  });

  // Sort functions for events
  const eventSortFunctions = useMemo(() => ({
    title: (a: any, b: any) => (a.title || '').localeCompare(b.title || '', 'hu'),
    type: (a: any, b: any) => {
      const getType = (item: any) => item.project_id ? 'project' : item.sales_id ? 'sales' : 'personal';
      return getType(a).localeCompare(getType(b), 'hu');
    },
    partner: (a: any, b: any) => (a.partner?.name || '').localeCompare(b.partner?.name || '', 'hu'),
    startTime: (a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    location: (a: any, b: any) => (a.location || '').localeCompare(b.location || '', 'hu'),
  }), []);

  const { sortedData: filteredEvents, sortState: eventSortState, handleSort: handleEventSort } = useSortableData({
    data: preFilteredEvents,
    sortFunctions: eventSortFunctions,
  });

  // Bulk selection for tasks and events (must be after filteredTasks/Events are defined)
  const taskBulkSelection = useBulkSelection(filteredTasks);
  const eventBulkSelection = useBulkSelection(filteredEvents);

  // Bulk operations for tasks and events
  const taskBulkOps = useBulkOperations({
    entityType: 'tasks',
    queryKey: ['my-items'],
    onSuccess: () => taskBulkSelection.clearSelection(),
  });

  const eventBulkOps = useBulkOperations({
    entityType: 'events',
    queryKey: ['my-items'],
    onSuccess: () => eventBulkSelection.clearSelection(),
  });

  const [bulkDeleteTasksOpen, setBulkDeleteTasksOpen] = useState(false);
  const [bulkDeleteEventsOpen, setBulkDeleteEventsOpen] = useState(false);

  const taskStatusOptions = useMemo(() => [
    { value: 'pending', label: t('tasks.status.pending') },
    { value: 'in_progress', label: t('tasks.status.in_progress') },
    { value: 'completed', label: t('tasks.status.completed') },
    { value: 'cancelled', label: t('tasks.status.cancelled') },
  ], [t]);

  const handleBulkTaskStatusChange = (status: string) => {
    taskBulkOps.bulkStatusChange.mutate({
      ids: Array.from(taskBulkSelection.selectedIds),
      status,
    });
  };

  const handleBulkTaskDelete = () => {
    taskBulkOps.bulkDelete.mutate(Array.from(taskBulkSelection.selectedIds));
    setBulkDeleteTasksOpen(false);
  };

  const handleBulkEventDelete = () => {
    eventBulkOps.bulkDelete.mutate(Array.from(eventBulkSelection.selectedIds));
    setBulkDeleteEventsOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return variants[status] || 'secondary';
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleDeleteClick = (type: 'task' | 'event', id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      let error;
      if (itemToDelete.type === 'task') {
        const result = await supabase.rpc('soft_delete_task', { _task_id: itemToDelete.id });
        error = result.error;
      } else {
        const result = await supabase.rpc('soft_delete_event', { _event_id: itemToDelete.id });
        error = result.error;
      }

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      toast({ title: t('common.success'), description: t('common.deleted') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const getItemTypeLabel = (item: any) => {
    if (item.project_id) return { icon: FolderOpen, label: item.project?.name || t('myItems.project'), color: 'text-blue-500' };
    if (item.sales_id) return { icon: Briefcase, label: item.sales?.name || t('myItems.sales'), color: 'text-green-500' };
    return { icon: User, label: t('myItems.personal'), color: 'text-orange-500' };
  };

  const getTaskCellValue = (task: any, key: string) => {
    const typeInfo = getItemTypeLabel(task);
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
    const taskColor = getItemColor(task, 'task');

    switch (key) {
      case 'select':
        return (
          <Checkbox
            checked={taskBulkSelection.selectedIds.has(task.id)}
            onCheckedChange={() => taskBulkSelection.toggleItem(task.id)}
            onClick={(e) => e.stopPropagation()}
          />
        );
      case 'title':
        return (
          <div className="flex items-center gap-2">
            {taskColor && (
              <div className={`w-1.5 h-8 rounded-sm ${taskColor.bg} shrink-0`} />
            )}
            <span className="font-medium">{task.title}</span>
            {isOverdue && (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        );
      case 'status':
        return (
          <Badge variant={getStatusBadge(task.status)}>
            {t(`tasks.status.${task.status}`)}
          </Badge>
        );
      case 'type':
        return (
          <span className={`flex items-center gap-1 ${typeInfo.color}`}>
            <typeInfo.icon className="h-4 w-4" />
            {typeInfo.label}
          </span>
        );
      case 'partner':
        return task.partner ? (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/partners/${task.partner.id}`); }}
            className="text-primary hover:underline"
          >
            {task.partner.name}
          </button>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'deadline':
        return task.deadline ? (
          <span className="flex items-center gap-1 text-sm">
            <Clock className="h-3 w-3" />
            {format(new Date(task.deadline), 'yyyy.MM.dd HH:mm', { locale: hu })}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      default:
        return '-';
    }
  };

  const getEventCellValue = (event: any, key: string) => {
    const typeInfo = getItemTypeLabel(event);
    const eventColor = getItemColor(event, 'event');

    switch (key) {
      case 'select':
        return (
          <Checkbox
            checked={eventBulkSelection.selectedIds.has(event.id)}
            onCheckedChange={() => eventBulkSelection.toggleItem(event.id)}
            onClick={(e) => e.stopPropagation()}
          />
        );
      case 'title':
        return (
          <div className="flex items-center gap-2">
            {eventColor && (
              <div className={`w-1.5 h-8 rounded-sm ${eventColor.bg} shrink-0`} />
            )}
            <span className="font-medium">{event.title}</span>
            {event.is_all_day && (
              <Badge variant="outline">{t('events.allDay')}</Badge>
            )}
          </div>
        );
      case 'type':
        return (
          <span className={`flex items-center gap-1 ${typeInfo.color}`}>
            <typeInfo.icon className="h-4 w-4" />
            {typeInfo.label}
          </span>
        );
      case 'partner':
        return event.partner ? (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/partners/${event.partner.id}`); }}
            className="text-primary hover:underline"
          >
            {event.partner.name}
          </button>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'startTime':
        return (
          <span className="flex items-center gap-1 text-sm">
            <Clock className="h-3 w-3" />
            {format(new Date(event.start_time), event.is_all_day ? 'yyyy.MM.dd' : 'yyyy.MM.dd HH:mm', { locale: hu })}
            {event.end_time && (
              <> - {format(new Date(event.end_time), event.is_all_day ? 'yyyy.MM.dd' : 'HH:mm', { locale: hu })}</>
            )}
          </span>
        );
      case 'location':
        return event.location ? (
          <span className="text-sm truncate max-w-[200px] block">{event.location}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      default:
        return '-';
    }
  };

  if (!activeCompany) {
    return (
      <LicenseGuard feature="my_items">
        <div className="container mx-auto p-6">
          <p className="text-muted-foreground">{t('common.selectCompany')}</p>
        </div>
      </LicenseGuard>
    );
  }

  return (
    <LicenseGuard feature="my_items">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('myItems.title')}</h1>
            <p className="text-muted-foreground">{t('myItems.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('myItems.filterAll')}</SelectItem>
                <SelectItem value="personal">{t('myItems.filterPersonal')}</SelectItem>
                <SelectItem value="project">{t('myItems.filterProject')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              {t('myItems.tasks')} ({filteredTasks.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {t('myItems.events')} ({filteredEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('myItems.tasks')}</CardTitle>
                  <CardDescription>{t('myItems.tasksDescription')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <ColumnSettingsPopover
                    columnStates={taskColumns.columnStates}
                    columns={taskColumnConfigs}
                    onToggleVisibility={taskColumns.toggleVisibility}
                    onReorder={taskColumns.reorderColumns}
                    onReset={taskColumns.resetToDefaults}
                  />
                  <Button onClick={() => { setSelectedTask(null); setTaskDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('myItems.newTask')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <BulkActionsToolbar
                  selectedCount={taskBulkSelection.selectedCount}
                  onClearSelection={taskBulkSelection.clearSelection}
                  onBulkDelete={() => setBulkDeleteTasksOpen(true)}
                  onBulkStatusChange={handleBulkTaskStatusChange}
                  statusOptions={taskStatusOptions}
                  showStatusChange={true}
                  showDelete={true}
                />
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('myItems.noTasks')}</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <ResizableTable
                      visibleColumns={taskColumns.visibleColumns}
                      onColumnResize={taskColumns.setColumnWidth}
                      onColumnReorder={taskColumns.reorderColumns}
                      data={filteredTasks}
                      actionColumnWidth={100}
                      sortState={taskSortState}
                      onSort={handleTaskSort}
                      columnConfigs={taskColumnConfigs}
                      selectHeader={
                        <Checkbox
                          checked={taskBulkSelection.isAllSelected}
                          indeterminate={taskBulkSelection.isPartiallySelected}
                          onCheckedChange={taskBulkSelection.toggleAll}
                          aria-label="Select all tasks"
                        />
                      }
                      renderHeader={(col) => taskColumns.getColumnConfig(col.key)?.label || col.key}
                      renderRow={(task, columns) => (
                        <TableRow key={task.id}>
                          {columns.map((col) => (
                            <ResizableTableCell key={col.key} width={col.width}>
                              {getTaskCellValue(task, col.key)}
                            </ResizableTableCell>
                          ))}
                          <TableCell className="w-[100px]">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick('task', task.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('myItems.events')}</CardTitle>
                  <CardDescription>{t('myItems.eventsDescription')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <ColumnSettingsPopover
                    columnStates={eventColumns.columnStates}
                    columns={eventColumnConfigs}
                    onToggleVisibility={eventColumns.toggleVisibility}
                    onReorder={eventColumns.reorderColumns}
                    onReset={eventColumns.resetToDefaults}
                  />
                  <Button onClick={() => { setSelectedEvent(null); setEventDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('myItems.newEvent')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <BulkActionsToolbar
                  selectedCount={eventBulkSelection.selectedCount}
                  onClearSelection={eventBulkSelection.clearSelection}
                  onBulkDelete={() => setBulkDeleteEventsOpen(true)}
                  showStatusChange={false}
                  showDelete={true}
                />
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('myItems.noEvents')}</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <ResizableTable
                      visibleColumns={eventColumns.visibleColumns}
                      onColumnResize={eventColumns.setColumnWidth}
                      onColumnReorder={eventColumns.reorderColumns}
                      data={filteredEvents}
                      actionColumnWidth={100}
                      sortState={eventSortState}
                      onSort={handleEventSort}
                      columnConfigs={eventColumnConfigs}
                      selectHeader={
                        <Checkbox
                          checked={eventBulkSelection.isAllSelected}
                          indeterminate={eventBulkSelection.isPartiallySelected}
                          onCheckedChange={eventBulkSelection.toggleAll}
                          aria-label="Select all events"
                        />
                      }
                      renderHeader={(col) => eventColumns.getColumnConfig(col.key)?.label || col.key}
                      renderRow={(event, columns) => (
                        <TableRow key={event.id}>
                          {columns.map((col) => (
                            <ResizableTableCell key={col.key} width={col.width}>
                              {getEventCellValue(event, col.key)}
                            </ResizableTableCell>
                          ))}
                          <TableCell className="w-[100px]">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditEvent(event)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick('event', event.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={selectedTask}
        />

        <EventDialog
          open={eventDialogOpen}
          onOpenChange={setEventDialogOpen}
          event={selectedEvent}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('common.deleteWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BulkDeleteDialog
          open={bulkDeleteTasksOpen}
          onOpenChange={setBulkDeleteTasksOpen}
          onConfirm={handleBulkTaskDelete}
          count={taskBulkSelection.selectedCount}
          entityName={t('myItems.tasks')}
          isLoading={taskBulkOps.isProcessing}
        />

        <BulkDeleteDialog
          open={bulkDeleteEventsOpen}
          onOpenChange={setBulkDeleteEventsOpen}
          onConfirm={handleBulkEventDelete}
          count={eventBulkSelection.selectedCount}
          entityName={t('myItems.events')}
          isLoading={eventBulkOps.isProcessing}
        />
      </div>
    </LicenseGuard>
  );
}
