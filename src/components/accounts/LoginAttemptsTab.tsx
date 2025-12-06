import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLoginAttemptsList } from '@/hooks/useLoginAttemptsList';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';

const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'time', label: 'Időpont', defaultWidth: 180 },
  { key: 'email', label: 'Email', defaultWidth: 250 },
  { key: 'ip', label: 'IP Cím', defaultWidth: 150 },
  { key: 'user_agent', label: 'User Agent', defaultWidth: 250 },
  { key: 'status', label: 'Státusz', defaultWidth: 120 },
];

export const LoginAttemptsTab = () => {
  const { loginAttempts, isLoading } = useLoginAttemptsList(200);
  const [emailFilter, setEmailFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const queryClient = useQueryClient();

  const {
    visibleColumns,
    columnStates,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({
    storageKey: 'login-attempts-columns',
    columns: COLUMN_CONFIGS,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['login-attempts'] });
  };

  const filteredAttempts = useMemo(() => {
    return loginAttempts.filter((attempt: any) => {
      const matchesEmail = !emailFilter || attempt.email?.toLowerCase().includes(emailFilter.toLowerCase());
      const matchesIp = !ipFilter || attempt.ip_address?.includes(ipFilter);
      return matchesEmail && matchesIp;
    });
  }, [loginAttempts, emailFilter, ipFilter]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss');
  };

  // Statistics
  const stats = useMemo(() => {
    const successful = filteredAttempts.filter((a: any) => a.success).length;
    const failed = filteredAttempts.filter((a: any) => !a.success).length;
    const uniqueIps = new Set(filteredAttempts.map((a: any) => a.ip_address).filter(Boolean)).size;
    const uniqueEmails = new Set(filteredAttempts.map((a: any) => a.email)).size;

    return { successful, failed, uniqueIps, uniqueEmails };
  }, [filteredAttempts]);

  const renderCellContent = (attempt: any, columnKey: string) => {
    switch (columnKey) {
      case 'time':
        return <span className="font-mono text-xs">{formatDate(attempt.attempt_time)}</span>;
      case 'email':
        return attempt.email;
      case 'ip':
        return <span className="font-mono text-xs">{attempt.ip_address || 'N/A'}</span>;
      case 'user_agent':
        return (
          <span className="text-xs text-muted-foreground truncate block" title={attempt.user_agent}>
            {attempt.user_agent || 'N/A'}
          </span>
        );
      case 'status':
        return attempt.success ? (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Sikeres
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Sikertelen
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Frissítés
        </Button>
        <ColumnSettingsPopover
          columns={COLUMN_CONFIGS}
          columnStates={columnStates}
          onToggleVisibility={toggleVisibility}
          onReorder={reorderColumns}
          onReset={resetToDefaults}
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sikeres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.successful}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sikertelen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats.failed}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Egyedi IP címek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.uniqueIps}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Egyedi emailek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.uniqueEmails}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bejelentkezési Kísérletek</CardTitle>
          <CardDescription>
            Az összes bejelentkezési kísérlet időrendi sorrendben
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Email szűrő..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="IP cím szűrő..."
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Betöltés...</div>
          ) : filteredAttempts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nincs találat
            </div>
          ) : (
            <ResizableTable
              visibleColumns={visibleColumns}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
              getColumnConfig={getColumnConfig}
            >
              <TableBody>
                {filteredAttempts.map((attempt: any) => (
                  <TableRow key={attempt.id}>
                    {visibleColumns.map((col) => (
                      <ResizableTableCell 
                        key={col.key} 
                        width={col.width}
                        className={['time', 'status'].includes(col.key) ? 'text-center' : ''}
                      >
                        {renderCellContent(attempt, col.key)}
                      </ResizableTableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
};