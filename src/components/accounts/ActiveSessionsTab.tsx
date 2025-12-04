import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActiveSessions } from '@/hooks/useActiveSessions';
import { LogOut, RefreshCw, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

export const ActiveSessionsTab = () => {
  const { activeSessions, isLoading, terminateSession } = useActiveSessions();
  const { data: currentProfile } = useUserProfile();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

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
      // Select all except current user
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
        // Clear this user from selection if selected
        setSelectedUsers(prev => prev.filter(id => id !== userId));
      }
    });
  };

  const selectableCount = activeSessions.filter(s => s.user_id !== currentProfile?.id).length;

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
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {activeSessions.length} aktív felhasználó
        </Badge>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === selectableCount && selectableCount > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Felhasználó</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Utolsó bejelentkezés</TableHead>
                  <TableHead className="text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.map((session) => {
                  const isCurrentUser = session.user_id === currentProfile?.id;
                  const isSelected = selectedUsers.includes(session.user_id);

                  return (
                    <TableRow key={session.user_id}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => 
                            handleSelectUser(session.user_id, checked as boolean)
                          }
                          disabled={isCurrentUser}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {session.user_full_name || 'N/A'}
                        {isCurrentUser && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Te
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{session.user_email}</TableCell>
                      <TableCell>
                        {session.last_sign_in_at ? (
                          <span className="text-sm">
                            {new Date(session.last_sign_in_at).toLocaleString('hu-HU', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTerminateSingle(session.user_id)}
                          disabled={isCurrentUser || terminateSession.isPending}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Kijelentkeztetés
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
