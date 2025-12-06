import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import { isSuperAdmin } from '@/lib/roleUtils';
import { useTranslation } from 'react-i18next';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable } from '@/components/shared/ResizableTable';
import { useSortableData } from '@/hooks/useSortableData';

// User-Company Assignments Component
const UserCompanyAssignments = () => {
  const { t } = useTranslation();
  const [userFilter, setUserFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const assignmentColumnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'user_name', label: t('logs.userName') || 'Felhasználó', required: true, defaultWidth: 180 },
    { key: 'user_id', label: 'User ID', defaultWidth: 280 },
    { key: 'company_name', label: t('logs.company') || 'Vállalat', defaultWidth: 180 },
    { key: 'company_id', label: 'Company ID', defaultWidth: 280 },
    { key: 'role', label: t('settings.role') || 'Szerepkör', defaultWidth: 100 },
  ], [t]);

  const {
    columnStates: assignmentColumnStates,
    visibleColumns: assignmentVisibleColumns,
    toggleVisibility: assignmentToggleVisibility,
    setColumnWidth: assignmentSetColumnWidth,
    reorderColumns: assignmentReorderColumns,
    resetToDefaults: assignmentResetToDefaults,
    getColumnConfig: assignmentGetColumnConfig,
  } = useColumnSettings({
    storageKey: 'logs-assignments-column-settings',
    columns: assignmentColumnConfigs,
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['user-company-assignments'],
    queryFn: async () => {
      const { data: userCompaniesData, error: ucError } = await supabase
        .from('user_companies')
        .select(`
          id,
          user_id,
          company_id,
          profiles:user_id(full_name, role),
          companies:company_id(name)
        `)
        .order('user_id');
      
      if (ucError) throw ucError;

      // Fetch company permissions for each user-company pair
      const enrichedData = await Promise.all(
        userCompaniesData.map(async (uc: any) => {
          // If user is super_admin, show SA instead of fetching permissions
          if (uc.profiles?.role === 'super_admin') {
            return {
              ...uc,
              companyRole: 'SA'
            };
          }

          const { data: permData } = await supabase
            .from('user_company_permissions')
            .select('role')
            .eq('user_id', uc.user_id)
            .eq('company_id', uc.company_id)
            .maybeSingle();

          return {
            ...uc,
            companyRole: permData?.role || 'N/A'
          };
        })
      );

      return enrichedData;
    },
  });

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment: any) => {
    const userName = assignment.profiles?.full_name?.toLowerCase() || '';
    const companyName = assignment.companies?.name?.toLowerCase() || '';
    
    const matchesUser = userFilter === '' || 
      userName.includes(userFilter.toLowerCase());
    
    const matchesCompany = companyFilter === '' || 
      companyName.includes(companyFilter.toLowerCase());
    
    return matchesUser && matchesCompany;
  });

  const { sortedData: sortedAssignments, sortState: assignmentSortState, handleSort: handleAssignmentSort } = useSortableData({
    data: filteredAssignments,
    sortFunctions: {
      user_name: (a, b) => (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || '', 'hu'),
      user_id: (a, b) => (a.user_id || '').localeCompare(b.user_id || ''),
      company_name: (a, b) => (a.companies?.name || '').localeCompare(b.companies?.name || '', 'hu'),
      company_id: (a, b) => (a.company_id || '').localeCompare(b.company_id || ''),
      role: (a, b) => (a.companyRole || '').localeCompare(b.companyRole || ''),
    },
  });

  const renderAssignmentCellContent = (assignment: any, columnKey: string) => {
    switch (columnKey) {
      case 'user_name':
        return (
          <span className="text-sm font-medium">
            {assignment.profiles?.full_name || t('logs.unknown')}
          </span>
        );
      case 'user_id':
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {assignment.user_id}
          </span>
        );
      case 'company_name':
        return (
          <span className="text-sm">
            {assignment.companies?.name || t('logs.unknown')}
          </span>
        );
      case 'company_id':
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {assignment.company_id}
          </span>
        );
      case 'role':
        return (
          <Badge variant="secondary" className="text-xs h-5">
            {assignment.companyRole}
          </Badge>
        );
      default:
        return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">
            Felhasználó szűrő
          </label>
          <input
            type="text"
            placeholder="Keresés névre..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">
            Vállalat szűrő
          </label>
          <input
            type="text"
            placeholder="Keresés vállalatra..."
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>
        <div className="flex items-end">
          <ColumnSettingsPopover
            columnStates={assignmentColumnStates}
            columns={assignmentColumnConfigs}
            onToggleVisibility={assignmentToggleVisibility}
            onReorder={assignmentReorderColumns}
            onReset={assignmentResetToDefaults}
          />
        </div>
      </div>

      {sortedAssignments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('logs.noAssignments')}</p>
        </div>
      ) : (
        <ResizableTable
          visibleColumns={assignmentVisibleColumns}
          getColumnConfig={assignmentGetColumnConfig}
          onColumnResize={assignmentSetColumnWidth}
          onColumnReorder={assignmentReorderColumns}
          sortState={assignmentSortState}
          onSort={handleAssignmentSort}
        >
          <TableBody>
            {sortedAssignments.map((assignment: any) => (
              <TableRow key={assignment.id} className="h-10">
                {assignmentVisibleColumns.map((col) => (
                  <TableCell key={col.key} className="py-2" style={{ width: col.width }}>
                    {renderAssignmentCellContent(assignment, col.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </ResizableTable>
      )}
    </div>
  );
};

const Logs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  const logsColumnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'timestamp', label: t('logs.timestamp') || 'Időbélyeg', required: true, defaultWidth: 160 },
    { key: 'company', label: t('logs.company') || 'Vállalat', defaultWidth: 150 },
    { key: 'user', label: t('logs.user') || 'Felhasználó', defaultWidth: 180 },
    { key: 'entity_type', label: t('logs.entityType') || 'Entitás', defaultWidth: 120 },
    { key: 'action', label: t('logs.action') || 'Művelet', defaultWidth: 100 },
    { key: 'details', label: t('logs.details') || 'Részletek', defaultWidth: 250 },
  ], [t]);

  const {
    columnStates: logsColumnStates,
    visibleColumns: logsVisibleColumns,
    toggleVisibility: logsToggleVisibility,
    setColumnWidth: logsSetColumnWidth,
    reorderColumns: logsReorderColumns,
    resetToDefaults: logsResetToDefaults,
    getColumnConfig: logsGetColumnConfig,
  } = useColumnSettings({
    storageKey: 'logs-audit-column-settings',
    columns: logsColumnConfigs,
  });

  // Check if user is super_admin
  const isSuper = isSuperAdmin(profile);

  // Redirect if not super_admin
  if (!profileLoading && !isSuper) {
    navigate('/');
    return null;
  }

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isSuper,
  });

  // Fetch logs with filters
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['logs', selectedCompany, selectedEvent],
    queryFn: async () => {
      let query = supabase
        .from('logs')
        .select(`
          *,
          profiles:user_id(email, full_name),
          companies:company_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter by company
      if (selectedCompany !== 'all') {
        if (selectedCompany === 'system') {
          query = query.is('company_id', null);
        } else {
          query = query.eq('company_id', selectedCompany);
        }
      }

      // Filter by event type
      if (selectedEvent !== 'all') {
        query = query.eq('entity_type', selectedEvent);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isSuper,
  });

  const { sortedData: sortedLogs, sortState: logsSortState, handleSort: handleLogsSort } = useSortableData({
    data: logs,
    defaultSort: { key: 'timestamp', direction: 'desc' },
    sortFunctions: {
      timestamp: (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
      company: (a, b) => ((a.companies as any)?.name || '').localeCompare((b.companies as any)?.name || '', 'hu'),
      user: (a, b) => ((a.profiles as any)?.full_name || '').localeCompare((b.profiles as any)?.full_name || '', 'hu'),
      entity_type: (a, b) => (a.entity_type || '').localeCompare(b.entity_type || ''),
      action: (a, b) => (a.action || '').localeCompare(b.action || ''),
    },
  });

  // Get unique event types from logs
  const eventTypes = Array.from(
    new Set(logs.map((log) => log.entity_type).filter(Boolean))
  ).sort();

  const renderLogCellContent = (log: any, columnKey: string) => {
    switch (columnKey) {
      case 'timestamp':
        return (
          <span className="font-mono text-xs">
            {new Date(log.created_at!).toLocaleString('hu-HU')}
          </span>
        );
      case 'company':
        return log.company_id ? (
          <span className="text-sm">
            {(log.companies as any)?.name || log.company_id}
          </span>
        ) : (
          <Badge variant="outline">{t('logs.system')}</Badge>
        );
      case 'user':
        return (
          <div className="text-sm">
            <div className="font-medium">
              {(log.profiles as any)?.full_name || t('logs.unknown')}
            </div>
            <div className="text-muted-foreground text-xs">
              {(log.profiles as any)?.email}
            </div>
          </div>
        );
      case 'entity_type':
        return <Badge variant="secondary">{log.entity_type}</Badge>;
      case 'action':
        return (
          <Badge
            variant={
              log.action === 'DELETE'
                ? 'destructive'
                : log.action === 'CREATE'
                ? 'default'
                : 'outline'
            }
          >
            {log.action}
          </Badge>
        );
      case 'details':
        return log.entity_id ? (
          <div className="text-xs text-muted-foreground truncate">
            {t('logs.entityId')}: {log.entity_id}
          </div>
        ) : '-';
      default:
        return '-';
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuper) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('logs.accessDenied')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <LicenseGuard feature="audit">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('logs.title')}</h1>
          <p className="text-muted-foreground">{t('logs.description')}</p>
        </div>

        <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">{t('logs.auditLog')}</TabsTrigger>
          <TabsTrigger value="assignments">{t('logs.userAssignments')}</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>{t('logs.auditLog')}</CardTitle>
              <CardDescription>{t('logs.auditDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {t('logs.filterCompany')}
              </label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('logs.allCompanies')}</SelectItem>
                  <SelectItem value="system">{t('logs.systemEvents')}</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {t('logs.filterEvent')}
              </label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('logs.allEvents')}</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <ColumnSettingsPopover
                columnStates={logsColumnStates}
                columns={logsColumnConfigs}
                onToggleVisibility={logsToggleVisibility}
                onReorder={logsReorderColumns}
                onReset={logsResetToDefaults}
              />
            </div>
          </div>

          {/* Logs Table */}
          {logsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('logs.noLogs')}</p>
            </div>
          ) : (
            <ResizableTable
              visibleColumns={logsVisibleColumns}
              getColumnConfig={logsGetColumnConfig}
              onColumnResize={logsSetColumnWidth}
              onColumnReorder={logsReorderColumns}
              sortState={logsSortState}
              onSort={handleLogsSort}
            >
              <TableBody>
                {sortedLogs.map((log) => (
                  <TableRow key={log.id}>
                    {logsVisibleColumns.map((col) => (
                      <TableCell key={col.key} style={{ width: col.width }}>
                        {renderLogCellContent(log, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>{t('logs.userAssignments')}</CardTitle>
              <CardDescription>{t('logs.userAssignmentsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <UserCompanyAssignments />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </LicenseGuard>
  );
};

export default Logs;