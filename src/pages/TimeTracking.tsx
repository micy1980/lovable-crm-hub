import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimeTracking, TimeEntry } from '@/hooks/useTimeTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TableBody, TableRow } from '@/components/ui/table';
import { Clock, Square } from 'lucide-react';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';

const COLUMN_DEFINITIONS: ColumnConfig[] = [
  { key: 'task', label: 'Feladat', defaultWidth: 200, required: true },
  { key: 'project', label: 'Projekt', defaultWidth: 180 },
  { key: 'user', label: 'Felhasználó', defaultWidth: 150 },
  { key: 'start_time', label: 'Kezdés', defaultWidth: 130 },
  { key: 'end_time', label: 'Befejezés', defaultWidth: 130 },
  { key: 'duration', label: 'Időtartam', defaultWidth: 100 },
  { key: 'description', label: 'Leírás', defaultWidth: 200 },
  { key: 'status', label: 'Státusz', defaultWidth: 100 },
];

const TimeTracking = () => {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const { timeEntries, runningEntry, stopTimer, totalMinutes, isLoading } = useTimeTracking();
  
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('week');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const { 
    visibleColumns, 
    toggleVisibility, 
    setColumnWidth, 
    reorderColumns, 
    resetToDefaults,
    columnStates,
    getColumnConfig 
  } = useColumnSettings({
    storageKey: 'time-tracking-columns',
    columns: COLUMN_DEFINITIONS,
  });

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-filter', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id,
  });

  // Fetch users for filter
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-filter', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .rpc('get_company_users_for_assignment', { _company_id: activeCompany.id });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id,
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ó ${mins}p`;
    }
    return `${mins}p`;
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const filteredEntries = useMemo(() => {
    return timeEntries.filter((entry) => {
      const entryDate = new Date(entry.start_time);
      
      // Date filter
      let passesDateFilter = true;
      switch (dateFilter) {
        case 'today':
          passesDateFilter = entryDate >= today;
          break;
        case 'week':
          passesDateFilter = isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
          break;
        case 'month':
          passesDateFilter = isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            const start = parseISO(customStartDate);
            const end = parseISO(customEndDate);
            end.setHours(23, 59, 59, 999);
            passesDateFilter = isWithinInterval(entryDate, { start, end });
          }
          break;
        default:
          passesDateFilter = true;
      }
      
      // Project filter
      const passesProjectFilter = projectFilter === 'all' || 
        entry.task?.project?.name === projects.find((p: any) => p.id === projectFilter)?.name;
      
      // User filter
      const passesUserFilter = userFilter === 'all' || entry.user_id === userFilter;
      
      return passesDateFilter && passesProjectFilter && passesUserFilter;
    });
  }, [timeEntries, dateFilter, projectFilter, userFilter, customStartDate, customEndDate, today, weekStart, weekEnd, monthStart, monthEnd, projects]);

  const filteredTotal = filteredEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);

  // Group by project for summary
  const projectSummary = useMemo(() => {
    const summary: Record<string, { name: string; minutes: number; entries: number }> = {};
    filteredEntries.forEach(entry => {
      const projectName = entry.task?.project?.name || 'Projekt nélkül';
      if (!summary[projectName]) {
        summary[projectName] = { name: projectName, minutes: 0, entries: 0 };
      }
      summary[projectName].minutes += entry.duration_minutes || 0;
      summary[projectName].entries += 1;
    });
    return Object.values(summary).sort((a, b) => b.minutes - a.minutes);
  }, [filteredEntries]);

  // Prepare data for export
  const exportData = filteredEntries.map(entry => ({
    task: entry.task?.title || '-',
    project: entry.task?.project?.name || '-',
    user: users.find((u: any) => u.id === entry.user_id)?.full_name || '-',
    start_time: format(new Date(entry.start_time), 'yyyy.MM.dd HH:mm', { locale: hu }),
    end_time: entry.end_time ? format(new Date(entry.end_time), 'yyyy.MM.dd HH:mm', { locale: hu }) : '-',
    duration: entry.duration_minutes ? formatDuration(entry.duration_minutes) : '-',
    description: entry.description || '-',
    status: entry.is_running ? 'Fut' : 'Lezárt',
  }));

  const exportColumns = visibleColumns.map(col => ({
    header: getColumnConfig(col.key)?.label || col.key,
    key: col.key,
  }));

  const renderCell = (entry: TimeEntry, columnKey: string) => {
    switch (columnKey) {
      case 'task':
        return entry.task?.title || '-';
      case 'project':
        return entry.task?.project?.name || '-';
      case 'user':
        return users.find((u: any) => u.id === entry.user_id)?.full_name || '-';
      case 'start_time':
        return format(new Date(entry.start_time), 'MM.dd HH:mm', { locale: hu });
      case 'end_time':
        return entry.end_time ? format(new Date(entry.end_time), 'MM.dd HH:mm', { locale: hu }) : '-';
      case 'duration':
        return <span className="font-mono">{entry.duration_minutes ? formatDuration(entry.duration_minutes) : '-'}</span>;
      case 'description':
        return entry.description || '-';
      case 'status':
        return entry.is_running ? (
          <Badge variant="default">Fut</Badge>
        ) : (
          <Badge variant="secondary">Lezárt</Badge>
        );
      default:
        return '-';
    }
  };

  const renderHeader = (col: { key: string }) => {
    return getColumnConfig(col.key)?.label || col.key;
  };

  const renderRow = (entry: TimeEntry, columns: { key: string; width: number }[]) => {
    return (
      <TableBody key={entry.id}>
        <TableRow className="hover:bg-muted/50">
          {columns.map(col => (
            <ResizableTableCell 
              key={col.key} 
              width={col.width}
              className={['duration', 'start_time', 'end_time', 'status'].includes(col.key) ? 'text-center' : ''}
            >
              {renderCell(entry, col.key)}
            </ResizableTableCell>
          ))}
        </TableRow>
      </TableBody>
    );
  };

  return (
    <LicenseGuard feature="projects">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Időkövetés</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {runningEntry && (
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                <Badge variant="default" className="animate-pulse">Fut</Badge>
                <span className="text-sm font-medium">{runningEntry.task?.title}</span>
                <Button size="sm" variant="destructive" onClick={() => stopTimer(runningEntry.id)}>
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <ColumnSettingsPopover
              columns={COLUMN_DEFINITIONS}
              columnStates={columnStates}
              onToggleVisibility={toggleVisibility}
              onReorder={reorderColumns}
              onReset={resetToDefaults}
            />
            
            <ExportMenu
              data={exportData}
              columns={exportColumns}
              title="Időbejegyzések"
            />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-sm">Időszak</Label>
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Ma</SelectItem>
                    <SelectItem value="week">E hét</SelectItem>
                    <SelectItem value="month">E hónap</SelectItem>
                    <SelectItem value="custom">Egyéni</SelectItem>
                    <SelectItem value="all">Összes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilter === 'custom' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-sm">Kezdő dátum</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-36"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Záró dátum</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-36"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label className="text-sm">Projekt</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes projekt</SelectItem>
                    {projects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Felhasználó</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes felhasználó</SelectItem>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Összesen (szűrt)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(filteredTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bejegyzések száma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEntries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Teljes összeg</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(totalMinutes)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Aktív projektek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectSummary.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Project breakdown */}
        {projectSummary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projekt összesítés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {projectSummary.slice(0, 6).map((ps, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="font-medium truncate">{ps.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ps.entries} bejegyzés</Badge>
                      <span className="font-mono text-sm">{formatDuration(ps.minutes)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time entries table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nincsenek időbejegyzések a kiválasztott szűrőkkel
              </div>
            ) : (
              <ResizableTable
                visibleColumns={visibleColumns}
                onColumnResize={setColumnWidth}
                onColumnReorder={reorderColumns}
                renderHeader={renderHeader}
                renderRow={renderRow}
                data={filteredEntries}
                columnConfigs={COLUMN_DEFINITIONS}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </LicenseGuard>
  );
};

export default TimeTracking;
