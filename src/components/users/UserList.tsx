import { useState, useMemo } from 'react';
import { Pencil, Search, Building2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUsers } from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UserEditForm } from './UserEditForm';
import { UserCreateForm } from './UserCreateForm';
import { UserCompaniesDialog } from './UserCompaniesDialog';
import { UserDeleteDialog } from './UserDeleteDialog';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { isSuperAdmin, isAdminOrAbove } from '@/lib/roleUtils';
import { useAuth } from '@/contexts/AuthContext';

export function UserList() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { data: currentProfile } = useUserProfile();
  const { users, isLoading, toggleUserFlag, updateUser, createUser, deleteUser } = useUsers();
  const { companies } = useCompanies();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [companyAssignmentUser, setCompanyAssignmentUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const canEdit = isSuperAdmin(currentProfile) || isAdminOrAbove(currentProfile);

  const handleToggleFlag = (userId: string, field: 'is_active' | 'can_delete' | 'can_view_logs', currentValue: boolean) => {
    // Prevent users from deactivating themselves
    if (userId === currentUser?.id && field === 'is_active' && currentValue) {
      return;
    }
    
    toggleUserFlag.mutate({
      id: userId,
      field,
      value: !currentValue,
    });
  };

  const handleCreateUser = async (data: any) => {
    try {
      await createUser.mutateAsync(data);
      setIsCreateOpen(false);
    } catch (error: any) {
      // Email duplicate and weak password errors should be re-thrown
      // so the form component can handle them
      if (error?.errorCode === 'EMAIL_ALREADY_REGISTERED' || error?.isWeakPassword) {
        throw error;
      }
      // Other errors will bubble up naturally
    }
  };

  const handleDeleteUser = async (password: string) => {
    if (!deletingUser) return;
    await deleteUser.mutateAsync({
      targetUserId: deletingUser.id,
      password,
    });
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('users.title')}</CardTitle>
              <CardDescription>{t('users.description')}</CardDescription>
            </div>
            {canEdit && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('users.addUser')}
              </Button>
            )}
          </div>
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
                  <TableHead>Kód</TableHead>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {t('users.noUsers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user: any) => {
                    const isSelf = user.id === currentUser?.id;
                    const canToggleActive = canEdit && !(isSelf && user.is_active);
                    
                    return (
                       <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{user.user_code || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {canEdit && !isSelf ? (
                            <Select
                              value={user.role}
                              onValueChange={(value) => {
                                updateUser.mutate({ 
                                  id: user.id, 
                                  role: value as 'super_admin' | 'admin' | 'normal' | 'viewer' 
                                });
                              }}
                            >
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue>
                                  {user.role === 'super_admin' ? 'SA' : t(`users.roles.${user.role}`)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_admin">SA</SelectItem>
                                <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                                <SelectItem value="normal">{t('users.roles.normal')}</SelectItem>
                                <SelectItem value="viewer">{t('users.roles.viewer')}</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="capitalize">
                              {user.role === 'super_admin' ? 'SA' : user.role.replace('_', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={user.is_active}
                                    onCheckedChange={() => handleToggleFlag(user.id, 'is_active', user.is_active)}
                                    disabled={!canToggleActive}
                                    aria-label={user.is_active ? t('common.yes') : t('common.no')}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {user.is_active ? t('common.yes') : t('common.no')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={user.can_delete}
                                    onCheckedChange={() => handleToggleFlag(user.id, 'can_delete', user.can_delete)}
                                    disabled={!canEdit}
                                    aria-label={user.can_delete ? t('common.yes') : t('common.no')}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {user.can_delete ? t('common.yes') : t('common.no')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={user.can_view_logs}
                                    onCheckedChange={() => handleToggleFlag(user.id, 'can_view_logs', user.can_view_logs)}
                                    disabled={!canEdit}
                                    aria-label={user.can_view_logs ? t('common.yes') : t('common.no')}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {user.can_view_logs ? t('common.yes') : t('common.no')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                            {isSuperAdmin(currentProfile) && !isSelf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingUser(user)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('users.createTitle')}</DialogTitle>
          </DialogHeader>
          <UserCreateForm
            onSubmit={handleCreateUser}
            onClose={() => setIsCreateOpen(false)}
            isSubmitting={createUser.isPending}
          />
        </DialogContent>
      </Dialog>

      <UserCompaniesDialog
        user={companyAssignmentUser}
        open={!!companyAssignmentUser}
        onClose={() => setCompanyAssignmentUser(null)}
      />

      <UserDeleteDialog
        user={deletingUser}
        open={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        isDeleting={deleteUser.isPending}
      />
    </>
  );
}
