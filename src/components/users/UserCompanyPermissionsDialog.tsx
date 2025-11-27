import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface UserCompanyPermissionsDialogProps {
  user: any;
  open: boolean;
  onClose: () => void;
}

interface CompanyPermission {
  companyId: string;
  assigned: boolean;
  role: 'ADMIN' | 'NORMAL' | 'VIEWER';
  canDelete: boolean;
  canViewLogs: boolean;
  canEditMasterData: boolean;
}

export function UserCompanyPermissionsDialog({ user, open, onClose }: UserCompanyPermissionsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentProfile } = useUserProfile();
  const [companies, setCompanies] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Map<string, CompanyPermission>>(new Map());
  const [initialPermissions, setInitialPermissions] = useState<Map<string, CompanyPermission>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isUserSA = user?.role === 'super_admin';
  const isCurrentUserSA = isSuperAdmin(currentProfile);
  const isReadOnly = isUserSA; // SA permissions are read-only

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Load existing permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_company_permissions')
        .select('*')
        .eq('user_id', user.id);

      if (permissionsError) throw permissionsError;

      // Build permissions map
      const permMap = new Map<string, CompanyPermission>();
      
      companiesData?.forEach((company: any) => {
        const existingPerm = permissionsData?.find((p: any) => p.company_id === company.id);
        
        if (existingPerm) {
          permMap.set(company.id, {
            companyId: company.id,
            assigned: true,
            role: existingPerm.role,
            canDelete: existingPerm.can_delete,
            canViewLogs: existingPerm.can_view_logs,
            canEditMasterData: existingPerm.can_edit_master_data,
          });
        } else {
          // For SA users, show as assigned to all companies
          permMap.set(company.id, {
            companyId: company.id,
            assigned: isUserSA,
            role: 'NORMAL',
            canDelete: false,
            canViewLogs: false,
            canEditMasterData: false,
          });
        }
      });

      setPermissions(new Map(permMap));
      setInitialPermissions(new Map(permMap));
    } catch (error: any) {
      toast({
        title: t('users.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignedChange = (companyId: string, checked: boolean) => {
    const newPermissions = new Map(permissions);
    const perm = newPermissions.get(companyId);
    if (perm) {
      newPermissions.set(companyId, { ...perm, assigned: checked });
      setPermissions(newPermissions);
    }
  };

  const handleRoleChange = (companyId: string, role: 'ADMIN' | 'NORMAL' | 'VIEWER') => {
    const newPermissions = new Map(permissions);
    const perm = newPermissions.get(companyId);
    if (perm) {
      let updatedPerm = { ...perm, role };
      
      // Apply role constraints
      if (role === 'ADMIN') {
        updatedPerm.canEditMasterData = true;
      } else if (role === 'VIEWER') {
        updatedPerm.canDelete = false;
        updatedPerm.canEditMasterData = false;
      }
      
      newPermissions.set(companyId, updatedPerm);
      setPermissions(newPermissions);
    }
  };

  const handlePermissionChange = (
    companyId: string,
    field: 'canDelete' | 'canViewLogs' | 'canEditMasterData',
    value: boolean
  ) => {
    const newPermissions = new Map(permissions);
    const perm = newPermissions.get(companyId);
    if (perm) {
      newPermissions.set(companyId, { ...perm, [field]: value });
      setPermissions(newPermissions);
    }
  };

  const handleSave = async () => {
    if (!user || isReadOnly) return;

    setIsSaving(true);
    try {
      const changes: Array<{
        action: 'insert' | 'update' | 'delete';
        companyId: string;
        data?: any;
      }> = [];

      // Compare current vs initial permissions
      permissions.forEach((perm, companyId) => {
        const initial = initialPermissions.get(companyId);

        if (perm.assigned && !initial?.assigned) {
          // New assignment
          changes.push({
            action: 'insert',
            companyId,
            data: {
              user_id: user.id,
              company_id: companyId,
              role: perm.role,
              can_delete: perm.canDelete,
              can_view_logs: perm.canViewLogs,
              can_edit_master_data: perm.canEditMasterData,
            },
          });
        } else if (!perm.assigned && initial?.assigned) {
          // Removed assignment
          changes.push({
            action: 'delete',
            companyId,
          });
        } else if (perm.assigned && initial?.assigned) {
          // Check if permissions changed
          if (
            perm.role !== initial.role ||
            perm.canDelete !== initial.canDelete ||
            perm.canViewLogs !== initial.canViewLogs ||
            perm.canEditMasterData !== initial.canEditMasterData
          ) {
            changes.push({
              action: 'update',
              companyId,
              data: {
                role: perm.role,
                can_delete: perm.canDelete,
                can_view_logs: perm.canViewLogs,
                can_edit_master_data: perm.canEditMasterData,
              },
            });
          }
        }
      });

      // Execute changes
      for (const change of changes) {
        if (change.action === 'insert') {
          const { error } = await supabase
            .from('user_company_permissions')
            .insert(change.data);
          if (error) throw error;
        } else if (change.action === 'update') {
          const { error } = await supabase
            .from('user_company_permissions')
            .update(change.data)
            .eq('user_id', user.id)
            .eq('company_id', change.companyId);
          if (error) throw error;
        } else if (change.action === 'delete') {
          const { error } = await supabase
            .from('user_company_permissions')
            .delete()
            .eq('user_id', user.id)
            .eq('company_id', change.companyId);
          if (error) throw error;
        }
      }

      // Also update user_companies for backward compatibility
      const assignedCompanyIds = Array.from(permissions.entries())
        .filter(([, perm]) => perm.assigned)
        .map(([companyId]) => companyId);

      // Get current user_companies
      const { data: existingUserCompanies } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id);

      const existingIds = new Set(existingUserCompanies?.map((uc: any) => uc.company_id) || []);
      const newIds = new Set(assignedCompanyIds);

      // Insert missing
      const toInsert = assignedCompanyIds.filter(id => !existingIds.has(id));
      if (toInsert.length > 0) {
        await supabase.from('user_companies').insert(
          toInsert.map(id => ({ user_id: user.id, company_id: id }))
        );
      }

      // Delete removed
      const toDelete = Array.from(existingIds).filter(id => !newIds.has(id));
      if (toDelete.length > 0) {
        await supabase
          .from('user_companies')
          .delete()
          .eq('user_id', user.id)
          .in('company_id', toDelete);
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-companies'] });

      toast({
        title: t('users.permissionsUpdated'),
      });

      onClose();
    } catch (error: any) {
      toast({
        title: t('users.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t('users.companyPermissions')} - {user.full_name || user.email}
          </DialogTitle>
          {isReadOnly && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('users.saPermissionsReadOnly')}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">{t('users.assigned')}</TableHead>
                  <TableHead className="w-[200px]">{t('users.companyName')}</TableHead>
                  <TableHead className="w-[140px]">{t('users.role')}</TableHead>
                  <TableHead className="w-[120px] text-center">{t('users.canDelete')}</TableHead>
                  <TableHead className="w-[120px] text-center">{t('users.canViewLogs')}</TableHead>
                  <TableHead className="w-[150px] text-center">{t('users.canEditMasterData')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('users.noCompaniesAvailable')}
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company: any) => {
                    const perm = permissions.get(company.id);
                    if (!perm) return null;

                    const isAssigned = perm.assigned;
                    const role = perm.role;

                    return (
                      <TableRow key={company.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox
                            checked={isAssigned}
                            onCheckedChange={(checked) =>
                              handleAssignedChange(company.id, checked as boolean)
                            }
                            disabled={isReadOnly}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>
                          <Select
                            value={role}
                            onValueChange={(value) =>
                              handleRoleChange(company.id, value as 'ADMIN' | 'NORMAL' | 'VIEWER')
                            }
                            disabled={!isAssigned || isReadOnly}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">{t('users.roles.admin')}</SelectItem>
                              <SelectItem value="NORMAL">{t('users.roles.normal')}</SelectItem>
                              <SelectItem value="VIEWER">{t('users.roles.viewer')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={perm.canDelete}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(company.id, 'canDelete', checked)
                            }
                            disabled={!isAssigned || isReadOnly || role === 'VIEWER'}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={perm.canViewLogs}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(company.id, 'canViewLogs', checked)
                            }
                            disabled={!isAssigned || isReadOnly}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={perm.canEditMasterData}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(company.id, 'canEditMasterData', checked)
                            }
                            disabled={!isAssigned || isReadOnly || role === 'ADMIN' || role === 'VIEWER'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isReadOnly}>
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
