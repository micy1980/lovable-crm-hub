import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Search, Building2, Plus, Trash2, Power, LockKeyhole, Unlock, Mail, UserCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TableBody, TableRow } from '@/components/ui/table';
import { useUsers } from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useLockedAccounts } from '@/hooks/useLockedAccounts';
import { UserEditForm } from './UserEditForm';
import { UserCreateForm } from './UserCreateForm';
import { UserCompanyPermissionsDialog } from './UserCompanyPermissionsDialog';
import { UserDeleteDialog } from './UserDeleteDialog';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { isSuperAdmin, isAdminOrAbove } from '@/lib/roleUtils';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';

const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'user', label: 'Felhasználó', defaultWidth: 250, required: true },
  { key: 'sa', label: 'SA státusz', defaultWidth: 90 },
  { key: 'status', label: 'Állapot', defaultWidth: 90 },
  { key: 'registration', label: 'Regisztráció', defaultWidth: 100 },
  { key: 'active', label: 'Aktív', defaultWidth: 100 },
  { key: 'permissions', label: 'Jogosultságok', defaultWidth: 100 },
  { key: 'createdAt', label: 'Létrehozva', defaultWidth: 140 },
  { key: 'actions', label: 'Műveletek', defaultWidth: 120 },
];

export function UserList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { data: currentProfile } = useUserProfile();
  const { users, isLoading, toggleUserFlag, updateUser, createUser, deleteUser } = useUsers();
  const { companies } = useCompanies();
  const { lockedAccounts, isUserLocked, unlockAccount, getLockedAccountDetails } = useLockedAccounts();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [companyAssignmentUser, setCompanyAssignmentUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const {
    visibleColumns,
    columnStates,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({
    storageKey: 'users-columns-v3',
    columns: COLUMN_CONFIGS,
  });

  const canEdit = isSuperAdmin(currentProfile) || isAdminOrAbove(currentProfile);
  const currentUserIsSA = isSuperAdmin(currentProfile);

  const handleToggleFlag = (userId: string, field: 'is_active' | 'can_delete' | 'can_view_logs', currentValue: boolean) => {
    if (userId === currentUser?.id && field === 'is_active' && currentValue) {
      return;
    }
    
    toggleUserFlag.mutate({
      id: userId,
      field,
      value: !currentValue,
    });
  };

  const handleCreateUser = async (data: any, sendInvite: boolean = false) => {
    try {
      const result = await createUser.mutateAsync({ ...data, sendInvite: false });
      
      if (sendInvite && result?.id) {
        try {
          const { data: inviteData, error } = await supabase.functions.invoke('send-registration-invite', {
            body: { userId: result.id }
          });
          
          queryClient.invalidateQueries({ queryKey: ['users'] });
          
          if (error) {
            console.error('Failed to send invite:', error);
            toast({
              title: t('users.userCreatedInviteFailed'),
              description: error.message,
              variant: 'destructive',
            });
          } else if (inviteData?.success === false && inviteData?.userCode) {
            toast({
              title: t('invitation.emailFailed'),
              description: (
                <div className="space-y-2">
                  <p>{t('invitation.shareManually')}</p>
                  <p className="font-mono text-lg font-bold">{t('invitation.code')}: {inviteData.userCode}</p>
                  <p className="text-xs break-all">{t('invitation.link')}: {inviteData.registerUrl}</p>
                </div>
              ),
              duration: 30000,
            });
          } else {
            toast({
              title: t('users.userCreatedAndInviteSent'),
            });
          }
        } catch (inviteError: any) {
          console.error('Failed to send invite:', inviteError);
          toast({
            title: t('users.userCreatedInviteFailed'),
            description: inviteError.message,
            variant: 'destructive',
          });
        }
      } else if (!sendInvite) {
        toast({
          title: t('users.userCreated'),
        });
      }
      
      setIsCreateOpen(false);
    } catch (error: any) {
      if (error?.errorCode === 'EMAIL_ALREADY_REGISTERED' || error?.isWeakPassword) {
        throw error;
      }
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
      if (aIsSA && !bIsSA) return -1;
      if (!aIsSA && bIsSA) return 1;
      return 0;
    });
  }, [users, searchQuery, roleFilter, statusFilter, companyFilter]);

  const renderCellContent = (user: any, columnKey: string, index: number) => {
    const isSelf = user.id === currentUser?.id;
    const canToggleActive = canEdit && !(isSelf && user.is_active);
    const isSA = user.role === 'super_admin';
    const userIsLocked = isUserLocked(user.id);
    const lockDetails = getLockedAccountDetails(user.id);

    switch (columnKey) {
      case 'user':
        return (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm truncate">{user.full_name || '-'}</span>
            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
          </div>
        );
      case 'sa':
        return isSA ? (
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
        );
      case 'status':
        return userIsLocked && lockDetails ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="text-xs font-medium cursor-help gap-1">
                  <LockKeyhole className="h-3 w-3" />
                  {t('users.locked')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold">{t('users.accountLockedDetails')}</p>
                  <p><span className="font-medium">{t('users.reason')}:</span> {lockDetails.reason || '-'}</p>
                  <p><span className="font-medium">{t('users.lockedAt')}:</span> {lockDetails.locked_at ? format(new Date(lockDetails.locked_at), 'yyyy-MM-dd HH:mm') : '-'}</p>
                  {lockDetails.locked_until && (
                    <p><span className="font-medium">{t('users.lockedUntil')}:</span> {format(new Date(lockDetails.locked_until), 'yyyy-MM-dd HH:mm')}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : userIsLocked ? (
          <Badge variant="destructive" className="text-xs font-medium gap-1">
            <LockKeyhole className="h-3 w-3" />
            {t('users.locked')}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'registration':
        if (user.registered_at) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="text-xs font-medium bg-green-600 text-white hover:bg-green-700 cursor-help gap-1">
                    <UserCheck className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {t('invitation.status.registered')} - {format(new Date(user.registered_at), 'yyyy-MM-dd HH:mm')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        } else if (user.invitation_sent_at) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="text-xs font-medium bg-yellow-600 text-white hover:bg-yellow-700 cursor-help gap-1">
                    <Mail className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p>{t('invitation.status.invited')}</p>
                    <p>{format(new Date(user.invitation_sent_at), 'yyyy-MM-dd HH:mm')}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        } else {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs font-medium cursor-help gap-1">
                    <Clock className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {t('invitation.status.notInvited')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      case 'active':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
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
        );
      case 'permissions':
        return (
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
        );
      case 'createdAt':
        return (
          <span className="text-xs text-muted-foreground">
            {format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')}
          </span>
        );
      case 'actions':
        return (
          <div className="flex items-center justify-center gap-1">
            {userIsLocked && currentUserIsSA && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700"
                      onClick={() => unlockAccount.mutate(user.id)}
                    >
                      <Unlock className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('users.unlockAccount')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {!(currentProfile?.role === 'admin' && isSA) && (
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
            )}
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
        );
      default:
        return null;
    }
  };

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

              <ColumnSettingsPopover
                columns={COLUMN_CONFIGS}
                columnStates={columnStates}
                onToggleVisibility={toggleVisibility}
                onReorder={reorderColumns}
                onReset={resetToDefaults}
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border rounded-lg">
                {t('users.noUsers')}
              </div>
            ) : (
              <ResizableTable
                visibleColumns={visibleColumns}
                onColumnResize={setColumnWidth}
                onColumnReorder={reorderColumns}
                getColumnConfig={getColumnConfig}
              >
                <TableBody>
                  {filteredUsers.map((user: any, index: number) => {
                    const isSA = user.role === 'super_admin';
                    const nextUser = filteredUsers[index + 1];
                    const isLastSA = isSA && (!nextUser || nextUser.role !== 'super_admin');
                    
                    return (
                      <TableRow 
                        key={user.id}
                        className={cn(
                          index % 2 === 1 ? 'bg-muted/10' : '',
                          isLastSA ? 'border-b-2' : ''
                        )}
                      >
                        {visibleColumns.map((col) => (
                          <ResizableTableCell 
                            key={col.key} 
                            width={col.width}
                            className={col.key !== 'user' ? 'text-center' : ''}
                          >
                            {renderCellContent(user, col.key, index)}
                          </ResizableTableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </ResizableTable>
            )}
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
