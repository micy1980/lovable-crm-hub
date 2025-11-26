import { useState, useMemo } from 'react';
import { Pencil, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';
import { UserEditForm } from './UserEditForm';
import { UserCompaniesDialog } from './UserCompaniesDialog';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

export function UserList() {
  const { t } = useTranslation();
  const { users, isLoading } = useUsers();
  const { companies } = useCompanies();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [companyAssignmentUser, setCompanyAssignmentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const filteredUsers = useMemo(() => {
    return users.filter((user: any) => {
      const matchesSearch =
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active);
      
      const matchesCompany =
        companyFilter === 'all' ||
        user.user_companies?.some((uc: any) => uc.company_id === companyFilter);

      return matchesSearch && matchesRole && matchesStatus && matchesCompany;
    });
  }, [users, searchQuery, roleFilter, statusFilter, companyFilter]);

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
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('users.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t('users.filterByRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('users.allRoles')}</SelectItem>
                  <SelectItem value="super_admin">SA</SelectItem>
                  <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                  <SelectItem value="normal">{t('users.roles.normal')}</SelectItem>
                  <SelectItem value="viewer">{t('users.roles.viewer')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t('users.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('users.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('users.active')}</SelectItem>
                  <SelectItem value="inactive">{t('users.inactive')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t('users.filterByCompany')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('users.allCompanies')}</SelectItem>
                  {companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.fullName')}</TableHead>
                  <TableHead>{t('users.role')}</TableHead>
                  <TableHead className="text-center">{t('users.isActive')}</TableHead>
                  <TableHead className="text-center">{t('users.canDelete')}</TableHead>
                  <TableHead className="text-center">{t('users.canViewLogs')}</TableHead>
                  <TableHead className="text-right">{t('users.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t('users.noUsers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role === 'super_admin' ? 'SA' : user.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.is_active ? 'default' : 'secondary'} className="text-xs">
                      {user.is_active ? t('common.yes') : t('common.no')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.can_delete ? 'default' : 'secondary'} className="text-xs">
                      {user.can_delete ? t('common.yes') : t('common.no')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.can_view_logs ? 'default' : 'secondary'} className="text-xs">
                      {user.can_view_logs ? t('common.yes') : t('common.no')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {format(new Date(user.created_at), 'PP')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingUser(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCompanyAssignmentUser(user)}
                      >
                        <Building2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        user={companyAssignmentUser}
        open={!!companyAssignmentUser}
        onClose={() => setCompanyAssignmentUser(null)}
      />
    </>
  );
}
