import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Lock, AlertTriangle, Calendar, Trash2, Pencil } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { useContracts } from '@/hooks/useContracts';
import { useCompany } from '@/contexts/CompanyContext';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import ContractDialog from '@/components/contracts/ContractDialog';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { formatCurrency, getNumberFormatSettings } from '@/lib/formatCurrency';
import { useSortableData } from '@/hooks/useSortableData';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin, isAdminOrAbove } from '@/lib/roleUtils';
import { PasswordConfirmDialog } from '@/components/shared/PasswordConfirmDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STORAGE_KEY = 'contracts-column-settings';

const Contracts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { data: profile } = useUserProfile();
  const isSuper = isSuperAdmin(profile);
  const isAdmin = isAdminOrAbove(profile);
  const { contracts, isLoading, deleteContract, hardDeleteContract } = useContracts();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<any>(null);
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
  const [contractToHardDelete, setContractToHardDelete] = useState<any>(null);
  const { settings: systemSettings } = useSystemSettings();
  const numberFormatSettings = getNumberFormatSettings(systemSettings);

  const columnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'title', label: 'Megnevezés', defaultVisible: true, defaultWidth: 250, required: true },
    { key: 'partner', label: 'Partner', defaultVisible: true, defaultWidth: 180 },
    { key: 'type', label: 'Típus', defaultVisible: true, defaultWidth: 120 },
    { key: 'expiry', label: 'Érvényesség', defaultVisible: true, defaultWidth: 180 },
    { key: 'value', label: 'Érték', defaultVisible: true, defaultWidth: 140 },
    { key: 'status', label: 'Státusz', defaultVisible: true, defaultWidth: 100 },
    { key: 'actions', label: 'Műveletek', defaultVisible: true, defaultWidth: 100, sortable: false },
  ], []);

  const rightAlignedColumns = ['value'];

  const {
    columnStates,
    visibleColumns,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({ storageKey: STORAGE_KEY, columns: columnConfigs });

  const filteredContracts = useMemo(() => {
    if (!searchTerm) return contracts;
    const lower = searchTerm.toLowerCase();
    return contracts.filter(c =>
      c.title.toLowerCase().includes(lower) ||
      c.contract_number?.toLowerCase().includes(lower) ||
      c.partner?.name?.toLowerCase().includes(lower)
    );
  }, [contracts, searchTerm]);

  const { sortedData: sortedContracts, sortState, handleSort } = useSortableData({
    data: filteredContracts,
    sortFunctions: {
      title: (a, b) => (a.title || '').localeCompare(b.title || '', 'hu'),
      partner: (a, b) => (a.partner?.name || '').localeCompare(b.partner?.name || '', 'hu'),
      type: (a, b) => (a.contract_type || '').localeCompare(b.contract_type || '', 'hu'),
      expiry: (a, b) => new Date(a.expiry_date || 0).getTime() - new Date(b.expiry_date || 0).getTime(),
      value: (a, b) => (a.total_value || 0) - (b.total_value || 0),
      status: (a, b) => (a.status || '').localeCompare(b.status || ''),
    },
  });

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'secondary', label: 'Tervezet' },
      active: { variant: 'default', label: 'Aktív' },
      expired: { variant: 'destructive', label: 'Lejárt' },
      terminated: { variant: 'destructive', label: 'Megszűnt' },
      renewed: { variant: 'outline', label: 'Megújítva' },
    };
    const config = variants[status || 'draft'] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getExpiryWarning = (contract: any) => {
    if (!contract.expiry_date || contract.status === 'expired' || contract.status === 'terminated') {
      return null;
    }
    
    const daysUntilExpiry = differenceInDays(parseISO(contract.expiry_date), new Date());
    const warningDays = contract.expiry_warning_days || 30;
    
    if (daysUntilExpiry <= 0) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Lejárt</Badge>;
    } else if (daysUntilExpiry <= warningDays) {
      return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600"><AlertTriangle className="h-3 w-3" />{daysUntilExpiry} nap</Badge>;
    }
    return null;
  };

  const handleEdit = (contract: any) => {
    setSelectedContract(contract);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedContract(null);
  };


  const handleSoftDeleteClick = (contract: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setContractToDelete(contract);
    setDeleteDialogOpen(true);
  };

  const handleHardDeleteClick = (contract: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setContractToHardDelete(contract);
    setHardDeleteDialogOpen(true);
  };

  const handleConfirmSoftDelete = async () => {
    if (contractToDelete) {
      await deleteContract.mutateAsync(contractToDelete.id);
      setDeleteDialogOpen(false);
      setContractToDelete(null);
    }
  };

  const handleConfirmHardDelete = async () => {
    if (contractToHardDelete) {
      await hardDeleteContract.mutateAsync(contractToHardDelete.id);
      setHardDeleteDialogOpen(false);
      setContractToHardDelete(null);
    }
  };

  const getCellValue = (contract: any, key: string) => {
    switch (key) {
      case 'title':
        return (
          <div className="flex items-center gap-2">
            {contract.restrict_access && (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <div className="font-medium flex items-center gap-2">
                {contract.title}
                {contract.deleted_at && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Törölt
                  </Badge>
                )}
              </div>
              {contract.contract_number && (
                <div className="text-sm text-muted-foreground">
                  {contract.contract_number}
                </div>
              )}
            </div>
          </div>
        );
      case 'partner':
        return contract.partner?.name || '-';
      case 'type':
        return contract.contract_type || '-';
      case 'expiry':
        return (
          <div className="flex items-center gap-2">
            {contract.expiry_date ? (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(contract.expiry_date), 'yyyy.MM.dd', { locale: hu })}
              </span>
            ) : (
              '-'
            )}
            {getExpiryWarning(contract)}
          </div>
        );
      case 'value':
        return <span className="font-mono">{formatCurrency(contract.total_value, contract.currency, numberFormatSettings)} {contract.currency || 'HUF'}</span>;
      case 'status':
        return getStatusBadge(contract.status);
      case 'actions':
        return (
          <div className="flex items-center justify-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(contract);
              }}
              title="Szerkesztés"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {isAdmin && !contract.deleted_at && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => handleSoftDeleteClick(contract, e)}
                title="Törlés"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {isSuper && contract.deleted_at && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => handleHardDeleteClick(contract, e)}
                title="Végleges törlés"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      default:
        return '-';
    }
  };

  if (!activeCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Válasszon céget a szerződések megtekintéséhez</p>
      </div>
    );
  }

  return (
    <LicenseGuard feature="documents">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Szerződések</h1>
            <p className="text-muted-foreground">Szerződés nyilvántartás kezelése</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Új szerződés
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ColumnSettingsPopover
            columnStates={columnStates}
            columns={columnConfigs}
            onToggleVisibility={toggleVisibility}
            onReorder={reorderColumns}
            onReset={resetToDefaults}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sortedContracts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nincs találat' : 'Még nincs szerződés'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ResizableTable
              visibleColumns={visibleColumns}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
              data={sortedContracts}
              renderHeader={(col) => getColumnConfig(col.key)?.label || col.key}
              sortState={sortState}
              onSort={handleSort}
              renderRow={(contract, columns) => (
                <TableRow 
                  key={contract.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${contract.deleted_at ? 'opacity-60' : ''}`}
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  {columns.map((col) => (
                    <ResizableTableCell 
                      key={col.key} 
                      width={col.width}
                      className={rightAlignedColumns.includes(col.key) ? 'text-right' : ''}
                    >
                      {getCellValue(contract, col.key)}
                    </ResizableTableCell>
                  ))}
                </TableRow>
              )}
            />
          </Card>
        )}
      </div>

      <ContractDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        contract={selectedContract}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Szerződés törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretné a "{contractToDelete?.title}" szerződést?
              A szerződés nem lesz látható, de nem törlődik véglegesen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSoftDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordConfirmDialog
        open={hardDeleteDialogOpen}
        onOpenChange={setHardDeleteDialogOpen}
        onConfirm={handleConfirmHardDelete}
        title="Szerződés végleges törlése"
        description={`A "${contractToHardDelete?.title}" szerződés és minden kapcsolódó adat véglegesen törlődik. Ez a művelet NEM vonható vissza.`}
      />
    </LicenseGuard>
  );
};

export default Contracts;
