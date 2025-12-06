import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLockedAccounts } from '@/hooks/useLockedAccounts';
import { LockOpen, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';

const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'name', label: 'Felhasználó', defaultWidth: 180 },
  { key: 'email', label: 'Email', defaultWidth: 220 },
  { key: 'locked_at', label: 'Zárolás Ideje', defaultWidth: 160 },
  { key: 'locked_until', label: 'Zárolás Vége', defaultWidth: 160 },
  { key: 'reason', label: 'Indok', defaultWidth: 200 },
  { key: 'status', label: 'Státusz', defaultWidth: 100 },
  { key: 'actions', label: 'Műveletek', defaultWidth: 120 },
];

export const LockedAccountsTab = () => {
  const { lockedAccounts, isLoading, unlockAccount } = useLockedAccounts();
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
    storageKey: 'locked-accounts-columns',
    columns: COLUMN_CONFIGS,
  });

  const handleUnlock = (userId: string) => {
    unlockAccount.mutate(userId);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['locked-accounts'] });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss');
  };

  const isExpired = (lockedUntil: string | null) => {
    if (!lockedUntil) return false;
    return new Date(lockedUntil) <= new Date();
  };

  const renderCellContent = (lock: any, columnKey: string) => {
    switch (columnKey) {
      case 'name':
        return lock.user_full_name || 'N/A';
      case 'email':
        return lock.user_email;
      case 'locked_at':
        return <span className="font-mono text-sm">{formatDate(lock.locked_at)}</span>;
      case 'locked_until':
        return (
          <span className="font-mono text-sm">
            {lock.locked_until ? formatDate(lock.locked_until) : 'Végtelen'}
          </span>
        );
      case 'reason':
        return (
          <span className="truncate block" title={lock.reason || 'Nincs megadva'}>
            {lock.reason || 'Nincs megadva'}
          </span>
        );
      case 'status':
        return isExpired(lock.locked_until) ? (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Lejárt
          </Badge>
        ) : (
          <Badge variant="destructive">Aktív</Badge>
        );
      case 'actions':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleUnlock(lock.user_id)}
            disabled={unlockAccount.isPending}
          >
            <LockOpen className="mr-2 h-4 w-4" />
            Feloldás
          </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Aktív Zárolások</CardTitle>
          <CardDescription>
            A rendszer által vagy adminisztrátor által zárolt fiókok listája
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Betöltés...</div>
          ) : lockedAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nincs jelenleg zárolt fiók
            </div>
          ) : (
            <ResizableTable
              visibleColumns={visibleColumns}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
              getColumnConfig={getColumnConfig}
            >
              <TableBody>
                {lockedAccounts.map((lock: any) => (
                  <TableRow key={lock.id}>
                    {visibleColumns.map((col) => (
                      <ResizableTableCell 
                        key={col.key} 
                        width={col.width}
                        className={['locked_at', 'locked_until', 'status', 'actions'].includes(col.key) ? 'text-center' : ''}
                      >
                        {renderCellContent(lock, col.key)}
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