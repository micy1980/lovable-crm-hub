import { useState } from 'react';
import { Pencil, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUsers } from '@/hooks/useUsers';
import { UserEditForm } from './UserEditForm';
import { UserCompaniesDialog } from './UserCompaniesDialog';
import { useTranslation } from 'react-i18next';

export function UserList() {
  const { t } = useTranslation();
  const { users, isLoading } = useUsers();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [managingCompanies, setManagingCompanies] = useState<any>(null);

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('users.title')}</CardTitle>
          <CardDescription>{t('users.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('users.email')}</TableHead>
                <TableHead>{t('users.fullName')}</TableHead>
                <TableHead>{t('users.role')}</TableHead>
                <TableHead>{t('users.status')}</TableHead>
                <TableHead>{t('users.companies')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.full_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {user.is_active ? (
                        <Badge variant="outline">{t('users.active')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('users.inactive')}</Badge>
                      )}
                      {user.can_delete && (
                        <Badge variant="secondary" className="text-xs">
                          {t('users.canDelete')}
                        </Badge>
                      )}
                      {user.can_view_logs && (
                        <Badge variant="secondary" className="text-xs">
                          {t('users.canViewLogs')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.user_companies?.length || 0} {t('users.companiesCount')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setManagingCompanies(user)}
                    >
                      <Building2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingUser(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.editTitle')}</DialogTitle>
          </DialogHeader>
          <UserEditForm
            user={editingUser}
            onClose={() => setEditingUser(null)}
          />
        </DialogContent>
      </Dialog>

      <UserCompaniesDialog
        user={managingCompanies}
        open={!!managingCompanies}
        onClose={() => setManagingCompanies(null)}
      />
    </>
  );
}
