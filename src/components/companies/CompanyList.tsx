import { useState, useMemo, useEffect } from 'react';
import { Pencil, Trash2, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCompanies } from '@/hooks/useCompanies';
import { CompanyForm } from './CompanyForm';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { CompanyLicenseInfo } from './CompanyLicenseInfo';
import { CompanyLicenseManagementDialog } from './CompanyLicenseManagementDialog';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { useCompanyLicenses } from '@/hooks/useCompanyLicenses';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';

const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'name', label: 'Név', defaultWidth: 200, required: true },
  { key: 'taxId', label: 'Adószám', defaultWidth: 120 },
  { key: 'address', label: 'Cím', defaultWidth: 200 },
  { key: 'license', label: 'Licensz', defaultWidth: 120 },
  { key: 'userCount', label: 'Felhasználók', defaultWidth: 120 },
  { key: 'createdAt', label: 'Létrehozva', defaultWidth: 120 },
  { key: 'actions', label: 'Műveletek', defaultWidth: 140 },
];

export function CompanyList() {
  const { t } = useTranslation();
  const { companies, isLoading, createCompany, updateCompany, deleteCompany } = useCompanies();
  const { data: profile } = useUserProfile();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [deletingCompany, setDeletingCompany] = useState<any>(null);
  const [managingLicenseCompany, setManagingLicenseCompany] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companiesWithUserCount, setCompaniesWithUserCount] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const userIsSuperAdmin = isSuperAdmin(profile);
  const { getUsedSeats, getLicenseForCompany } = useCompanyLicenses();

  const {
    visibleColumns,
    columnStates,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
  } = useColumnSettings({
    storageKey: 'companies-columns',
    columns: COLUMN_CONFIGS,
  });

  useMemo(() => {
    const fetchUserCounts = async () => {
      const companiesWithCount = await Promise.all(
        companies.map(async (company: any) => {
          const usedSeats = await getUsedSeats(company.id);
          const license = getLicenseForCompany(company.id);
          return { 
            ...company, 
            user_count: usedSeats,
            max_users: license?.max_users || 0
          };
        })
      );
      setCompaniesWithUserCount(companiesWithCount);
    };

    if (companies.length > 0) {
      fetchUserCounts();
    }
  }, [companies, getUsedSeats, getLicenseForCompany]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const filteredCompanies = useMemo(() => {
    const filtered = companiesWithUserCount.filter((company: any) => {
      const matchesSearch =
        company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.tax_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });

    return filtered.sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'user_count') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [companiesWithUserCount, searchQuery, sortField, sortDirection]);

  const handleEdit = (company: any) => {
    setEditingCompany(company);
  };

  const handleCreate = (data: any) => {
    createCompany.mutate(data, {
      onSuccess: () => setIsCreateOpen(false),
    });
  };

  const handleUpdate = (data: any) => {
    updateCompany.mutate({ id: editingCompany.id, ...data }, {
      onSuccess: () => setEditingCompany(null),
    });
  };

  const handleDelete = () => {
    if (deletingCompany) {
      deleteCompany.mutate(deletingCompany.id, {
        onSuccess: () => setDeletingCompany(null),
      });
    }
  };

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('companies.title')}</CardTitle>
            <CardDescription>{t('companies.description')}</CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('companies.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('companies.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ColumnSettingsPopover
              columns={COLUMN_CONFIGS}
              columnStates={columnStates}
              onToggleVisibility={toggleVisibility}
              onReorder={reorderColumns}
              onReset={resetToDefaults}
            />
          </div>

          <div className="border rounded-lg overflow-x-auto">
            {/* Header Row */}
            <div className="grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1fr_1.5fr] bg-background border-b border-border min-w-[800px]">
              <div 
                className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1 px-4 py-3 border-r border-border"
                onClick={() => handleSort('name')}
              >
                {t('companies.name')}
                {getSortIcon('name')}
              </div>
              <div 
                className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1 px-4 py-3 border-r border-border"
                onClick={() => handleSort('tax_id')}
              >
                {t('companies.taxId')}
                {getSortIcon('tax_id')}
              </div>
              <div 
                className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1 px-4 py-3 border-r border-border"
                onClick={() => handleSort('address')}
              >
                {t('companies.address')}
                {getSortIcon('address')}
              </div>
              <div className="text-sm font-semibold text-foreground text-center flex items-center justify-center px-4 py-3 border-r border-border">
                {t('companies.license')}
              </div>
              <div 
                className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1 px-4 py-3 border-r border-border"
                onClick={() => handleSort('user_count')}
              >
                {t('companies.userCount')}
                {getSortIcon('user_count')}
              </div>
              <div 
                className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1 px-4 py-3 border-r border-border"
                onClick={() => handleSort('created_at')}
              >
                {t('companies.createdAt')}
                {getSortIcon('created_at')}
              </div>
              <div className="text-sm font-semibold text-foreground text-center flex items-center justify-center px-4 py-3">{t('common.actions')}</div>
            </div>

            {/* Body Rows */}
            {filteredCompanies.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                {t('companies.empty')}
              </div>
            ) : (
              filteredCompanies.map((company: any, index: number) => (
                <div
                  key={company.id}
                  className="grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1fr_1.5fr] border-b border-border hover:bg-muted/20 transition-colors min-w-[800px]"
                >
                  <div className="font-medium flex items-center truncate px-4 py-3 border-r border-border">{company.name}</div>
                  <div className="flex items-center text-sm px-4 py-3 border-r border-border">{company.tax_id || '-'}</div>
                  <div className="flex items-center text-sm truncate px-4 py-3 border-r border-border">{company.address || '-'}</div>
                  <div className="flex items-center justify-center px-4 py-3 border-r border-border">
                    <CompanyLicenseInfo 
                      companyId={company.id} 
                      companyName={company.name}
                      isSuperAdmin={userIsSuperAdmin}
                    />
                  </div>
                  <div className="flex items-center justify-center text-sm px-4 py-3 border-r border-border">
                    {company.user_count} / {company.max_users || '-'}
                  </div>
                  <div className="flex items-center justify-center text-sm px-4 py-3 border-r border-border">
                    {company.created_at ? format(new Date(company.created_at), 'yyyy-MM-dd') : '-'}
                  </div>
                  <div className="flex items-center justify-center gap-1 px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(company)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {userIsSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setManagingLicenseCompany(company)}
                        className="h-8 w-8"
                        title="Licensz kezelés"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingCompany(company)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('companies.createTitle')}</DialogTitle>
          </DialogHeader>
          <CompanyForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={createCompany.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCompany} onOpenChange={() => setEditingCompany(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('companies.editTitle')}</DialogTitle>
          </DialogHeader>
          <CompanyForm
            initialData={editingCompany}
            onSubmit={handleUpdate}
            onCancel={() => setEditingCompany(null)}
            isSubmitting={updateCompany.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCompany} onOpenChange={() => setDeletingCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('companies.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('companies.deleteConfirm', { name: deletingCompany?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {managingLicenseCompany && (
        <CompanyLicenseManagementDialog
          open={!!managingLicenseCompany}
          onOpenChange={(open) => !open && setManagingLicenseCompany(null)}
          companyId={managingLicenseCompany.id}
          companyName={managingLicenseCompany.name}
        />
      )}
    </Card>
  );
}
