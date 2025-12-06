import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLockedAccounts } from '@/hooks/useLockedAccounts';
import { LockOpen, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

export const LockedAccountsTab = () => {
  const { lockedAccounts, isLoading, unlockAccount } = useLockedAccounts();
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Frissítés
        </Button>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Felhasználó</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Zárolás Ideje</TableHead>
                  <TableHead>Zárolás Vége</TableHead>
                  <TableHead>Indok</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockedAccounts.map((lock: any) => (
                  <TableRow key={lock.id}>
                    <TableCell className="font-medium">
                      {lock.user_full_name || 'N/A'}
                    </TableCell>
                    <TableCell>{lock.user_email}</TableCell>
                    <TableCell className="text-center">{formatDate(lock.locked_at)}</TableCell>
                    <TableCell className="text-center">
                      {lock.locked_until ? formatDate(lock.locked_until) : 'Végtelen'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {lock.reason || 'Nincs megadva'}
                    </TableCell>
                    <TableCell className="text-center">
                      {isExpired(lock.locked_until) ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Lejárt
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Aktív
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnlock(lock.user_id)}
                        disabled={unlockAccount.isPending}
                      >
                        <LockOpen className="mr-2 h-4 w-4" />
                        Feloldás
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
