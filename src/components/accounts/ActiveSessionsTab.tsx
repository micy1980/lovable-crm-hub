import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActiveSessions } from '@/hooks/useActiveSessions';
import { LogOut, RefreshCw, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useMemo } from 'react';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';

const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'select', label: '', defaultWidth: 50, required: true },
  { key: 'name', label: 'Felhasználó', defaultWidth: 200 },
  { key: 'email', label: 'Email', defaultWidth: 250 },
  { key: 'last_sign_in', label: 'Utolsó bejelentkezés', defaultWidth: 180 },
  { key: 'actions', label: 'Műveletek', defaultWidth: 150 },
];

export const ActiveSessionsTab = () => {
  const { activeSessions, isLoading, terminateSession } = useActiveSessions();
  const { data: currentProfile } = useUserProfile();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const {
    visibleColumns,
    columnStates,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({
    storageKey: 'active-sessions-columns',
    columns: COLUMN_CONFIGS,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = activeSessions
        .filter(s => s.user_id !== currentProfile?.id)
        .map(s => s.user_id);
      setSelectedUsers(selectableIds);
    } else {
      setSelectedUsers([]);
    }
  };

  const handleTerminateSelected = async () => {
    for (const userId of selectedUsers) {
      await terminateSession.mutateAsync(userId);
    }
    setSelectedUsers([]);
  };

  const handleTerminateSingle = (userId: string) => {
    terminateSession.mutate(userId, {
      onSuccess: () => {
        setSelectedUsers(prev => prev.filter(id => id !== userId));
      }
    });
  };

  const selectableCount = activeSessions.filter(s => s.user_id !== currentProfile?.id).length;

  const renderCellContent = (session: any, columnKey: string) => {
    const isCurrentUser = session.user_id === currentProfile?.id;
    const isSelected = selectedUsers.includes(session.user_id);

    switch (columnKey) {
      case 'select':
        return (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => handleSelectUser(session.user_id, checked as boolean)}
            disabled={isCurrentUser}
          />
        );
      case 'name':
        return (
          <span className="flex items-center gap-2">
            {session.user_full_name || 'N/A'}
            {isCurrentUser && (
              <Badge variant="secondary" className="text-xs">Te</Badge>
            )}
          </span>
        );
      case 'email':
        return session.user_email;
      case 'last_sign_in':
        return session.last_sign_in_at ? (
          <span className="text-sm font-mono">
            {new Date(session.last_sign_in_at).toLocaleString('hu-HU', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        ) : '-';
      case 'actions':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTerminateSingle(session.user_id)}
            disabled={isCurrentUser || terminateSession.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Kijelentkeztetés
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Frissítés
          </Button>
          {selectedUsers.length > 0 && (
            <Button
              onClick={handleTerminateSelected}
              variant="destructive"
              size="sm"
              disabled={terminateSession.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Kijelöltek kijelentkeztetése ({selectedUsers.length})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {activeSessions.length} aktív felhasználó
          </Badge>
          <ColumnSettingsPopover
            columns={COLUMN_CONFIGS}
            columnStates={columnStates}
            onToggleVisibility={toggleVisibility}
            onReorder={reorderColumns}
            onReset={resetToDefaults}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktív Felhasználók</CardTitle>
          <CardDescription>
            Jelenleg aktív felhasználók listája - kijelentkeztetéssel megszüntetheted a sessionjüket
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Betöltés...</div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nincs aktív felhasználó
            </div>
          ) : (
            <ResizableTable
              visibleColumns={visibleColumns}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
              getColumnConfig={getColumnConfig}
            >
              <TableBody>
                {activeSessions.map((session) => (
                  <TableRow key={session.user_id}>
                    {visibleColumns.map((col) => (
                      <ResizableTableCell 
                        key={col.key} 
                        width={col.width}
                        className={['select', 'last_sign_in', 'actions'].includes(col.key) ? 'text-center' : ''}
                      >
                        {renderCellContent(session, col.key)}
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