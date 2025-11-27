import { useState, useMemo } from 'react';
import { Pencil, Search, Building2, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Power, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { UserCompanyPermissionsDialog } from './UserCompanyPermissionsDialog';
import { UserDeleteDialog } from './UserDeleteDialog';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { isSuperAdmin, isAdminOrAbove } from '@/lib/roleUtils';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const canEdit = isSuperAdmin(currentProfile) || isAdminOrAbove(currentProfile);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'admin':
        return 'bg-purple-600 text-white hover:bg-purple-700';
      case 'normal':
        return 'bg-gray-500 text-white hover:bg-gray-600';
      case 'viewer':
        return 'bg-green-600 text-white hover:bg-green-700';
      default:
        return 'bg-gray-500 text-white hover:bg-gray-600';
    }
  };

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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4 inline" />
      : <ArrowDown className="ml-2 h-4 w-4 inline" />;
  };

  const filteredUsers = useMemo(() => {
    const filtered = users.filter((user: any) => {
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

    // Sort with SA users always first
    return [...filtered].sort((a, b) => {
      const aIsSA = a.role === 'super_admin';
      const bIsSA = b.role === 'super_admin';
      
      // SA users always come first
      if (aIsSA && !bIsSA) return -1;
      if (!aIsSA && bIsSA) return 1;
      
      // Within SA or non-SA groups, apply the selected sort
      if (!sortColumn) return 0;
      
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'fullName':
          aValue = (a.full_name || '').toLowerCase();
          bValue = (b.full_name || '').toLowerCase();
          break;
        case 'isActive':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        case 'createdAt':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, searchQuery, roleFilter, statusFilter, companyFilter, sortColumn, sortDirection]);

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

            <div className="border rounded-lg overflow-hidden">
              {/* Header Row */}
              <div className="grid grid-cols-[220px_80px_100px_60px_150px_110px] gap-4 px-4 py-3 bg-muted/30 border-b border-border">
                <div 
                  className="text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={() => handleSort('fullName')}
                >
                  {t('users.user')}
                  {getSortIcon('fullName')}
                </div>
                <div className="text-sm font-semibold text-muted-foreground flex items-center justify-center">
                  {t('users.saStatus')}
                </div>
                <div 
                  className="text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center justify-center gap-1"
                  onClick={() => handleSort('isActive')}
                >
                  {t('users.active')}
                  {getSortIcon('isActive')}
                </div>
                <div className="text-sm font-semibold text-muted-foreground flex items-center justify-center">
                  {t('users.permissions')}
                </div>
                <div 
                  className="text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center justify-center gap-1"
                  onClick={() => handleSort('createdAt')}
                >
                  {t('users.createdAt')}
                  {getSortIcon('createdAt')}
                </div>
                <div className="text-sm font-semibold text-muted-foreground flex items-center justify-end">
                  {t('common.actions')}
                </div>
              </div>

              {/* Body Rows */}
              <div>
                {filteredUsers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {t('users.noUsers')}
                  </div>
                ) : (
                  filteredUsers.map((user: any, index: number) => {
                      const isSelf = user.id === currentUser?.id;
                      const canToggleActive = canEdit && !(isSelf && user.is_active);
                      const isSA = user.role === 'super_admin';
                      const currentUserIsSA = currentProfile?.role === 'super_admin';
                      const nextUser = filteredUsers[index + 1];
                      const isLastSA = isSA && (!nextUser || nextUser.role !== 'super_admin');
                      
                      return (
                        <div key={user.id}>
                          <div
                            className={cn(
                              "grid grid-cols-[220px_80px_100px_60px_150px_110px] gap-4 px-4 py-3 border-b hover:bg-muted/20 transition-colors",
                              index % 2 === 1 ? 'bg-muted/10' : '',
                              isLastSA ? 'border-b-2 border-border' : 'border-border'
                            )}
                          >
                            {/* User Column */}
                            <div className="flex flex-col justify-center min-w-0">
                              <span className="font-medium text-sm truncate">{user.full_name || '-'}</span>
                              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                            </div>

                            {/* SA Column */}
                            <div className="flex items-center justify-center">
                              {isSA ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-help">
                                        SA
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t('users.saBadgeTooltip')}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>

                            {/* Active Column */}
                            <div className="flex items-center justify-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center">
                                      <Switch
                                        checked={user.is_active}
                                        onCheckedChange={() => handleToggleFlag(user.id, 'is_active', user.is_active)}
                                        disabled={!canToggleActive}
                                        aria-label={t('users.isActive')}
                                        className="scale-90 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                                      />
                                      <Power className="h-4 w-4 ml-1.5 text-muted-foreground" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {t('users.isActive')}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

                            {/* Permissions Column */}
                            <div className="flex items-center justify-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setCompanyAssignmentUser(user)}
                                    >
                                      <Building2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {t('users.assignCompanies')}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

                            {/* Created At Column */}
                            <div className="flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')}
                              </span>
                            </div>

                            {/* Actions Column */}
                            <div className="flex items-center justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setEditingUser(user)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {t('users.editTitle')}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        "h-8 w-8",
                                        (isSA && (isSelf || !currentUserIsSA)) && "opacity-50 cursor-not-allowed"
                                      )}
                                      onClick={() => {
                                        if (!canEdit) return;
                                        if (isSA && isSelf) return;
                                        if (isSA && !currentUserIsSA) return;
                                        setDeletingUser(user);
                                      }}
                                      disabled={!canEdit || (isSA && (isSelf || !currentUserIsSA))}
                                    >
                              <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {isSA && isSelf 
                                      ? t('users.saCannotDeleteSelf')
                                      : isSA && !currentUserIsSA
                                      ? t('users.onlySaCanDeleteSa')
                                      : t('users.deleteUser')
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                }
              </div>
            </div>
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

        <UserCompanyPermissionsDialog
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
