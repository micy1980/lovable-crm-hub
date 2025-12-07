import { useState, useMemo } from 'react';
import { Pencil, Trash2, Plus, Search, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TableBody, TableRow } from '@/components/ui/table';
import { useCompanies } from '@/hooks/useCompanies';
import { CompanyForm } from './CompanyForm';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CompanyLicenseInfo } from './CompanyLicenseInfo';
import { CompanyLicenseManagementDialog } from './CompanyLicenseManagementDialog';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { useCompanyLicenses } from '@/hooks/useCompanyLicenses';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';
import { useSortableData } from '@/hooks/useSortableData';

const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'name', label: 'Név', defaultWidth: 200, required: true },
  { key: 'taxId', label: 'Adószám', defaultWidth: 140 },
  { key: 'address', label: 'Cím', defaultWidth: 200 },
  { key: 'license', label: 'Licensz', defaultWidth: 100, sortable: false },
  { key: 'userCount', label: 'Felhasználók', defaultWidth: 100 },
  { key: 'createdAt', label: 'Létrehozva', defaultWidth: 120 },
  { key: 'actions', label: 'Műveletek', defaultWidth: 140, sortable: false },
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
  
  const userIsSuperAdmin = isSuperAdmin(profile);
  const { getUsedSeats, getLicenseForCompany } = useCompanyLicenses();

  const {
    visibleColumns,
    columnStates,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
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

  const filteredCompanies = useMemo(() => {
    return companiesWithUserCount.filter((company: any) => {
      const matchesSearch =
        company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.tax_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [companiesWithUserCount, searchQuery]);

  const { sortedData: sortedCompanies, sortState, handleSort } = useSortableData({
    data: filteredCompanies,
    sortFunctions: {
      name: (a, b) => (a.name || '').localeCompare(b.name || '', 'hu'),
      taxId: (a, b) => (a.tax_id || '').localeCompare(b.tax_id || '', 'hu'),
      address: (a, b) => (a.address || '').localeCompare(b.address || '', 'hu'),
      userCount: (a, b) => (a.user_count || 0) - (b.user_count || 0),
      createdAt: (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
    },
  });

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

  const renderCellContent = (company: any, columnKey: string) => {
    switch (columnKey) {
      case 'name':
        return <span className="font-medium">{company.name}</span>;
      case 'taxId':
        return company.tax_id || '-';
      case 'address':
        return <span className="truncate block">{company.address || '-'}</span>;
      case 'license':
        return (
          <CompanyLicenseInfo 
            companyId={company.id} 
            companyName={company.name}
            isSuperAdmin={userIsSuperAdmin}
          />
        );
      case 'userCount':
        return `${company.user_count} / ${company.max_users || '-'}`;
      case 'createdAt':
        return company.created_at ? format(new Date(company.created_at), 'yyyy-MM-dd') : '-';
      case 'actions':
        return (
          <div className="flex items-center justify-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(company)}
              className="h-7 w-7"
              title="Szerkesztés"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {userIsSuperAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setManagingLicenseCompany(company)}
                className="h-7 w-7"
                title="Licensz kezelés"
              >
                <Key className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeletingCompany(company)}
              className="h-7 w-7"
              title="Törlés"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
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

          {sortedCompanies.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground border rounded-lg">
              {t('companies.empty')}
            </div>
          ) : (
            <ResizableTable
              visibleColumns={visibleColumns}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
              getColumnConfig={getColumnConfig}
              sortState={sortState}
              onSort={handleSort}
            >
              <TableBody>
                {sortedCompanies.map((company: any) => (
                  <TableRow key={company.id}>
                    {visibleColumns.map((col) => (
                      <ResizableTableCell 
                        key={col.key} 
                        width={col.width}
                        className={['license', 'userCount', 'createdAt', 'actions'].includes(col.key) ? 'text-center' : ''}
                      >
                        {renderCellContent(company, col.key)}
                      </ResizableTableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>
          )}
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
