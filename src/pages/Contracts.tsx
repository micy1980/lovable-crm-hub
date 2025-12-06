import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Lock, AlertTriangle, Calendar } from 'lucide-react';
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

const STORAGE_KEY = 'contracts-column-settings';

const Contracts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { contracts, isLoading } = useContracts();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const columnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'title', label: 'Megnevezés', defaultVisible: true, defaultWidth: 250, required: true },
    { key: 'partner', label: 'Partner', defaultVisible: true, defaultWidth: 180 },
    { key: 'type', label: 'Típus', defaultVisible: true, defaultWidth: 120 },
    { key: 'expiry', label: 'Érvényesség', defaultVisible: true, defaultWidth: 180 },
    { key: 'value', label: 'Érték', defaultVisible: true, defaultWidth: 140 },
    { key: 'status', label: 'Státusz', defaultVisible: true, defaultWidth: 100 },
  ], []);

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

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: currency || 'HUF',
      maximumFractionDigits: 0,
    }).format(value);
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
              <div className="font-medium">{contract.title}</div>
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
        return formatCurrency(contract.total_value, contract.currency);
      case 'status':
        return getStatusBadge(contract.status);
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
        ) : filteredContracts.length === 0 ? (
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
              data={filteredContracts}
              renderHeader={(col) => getColumnConfig(col.key)?.label || col.key}
              renderRow={(contract, columns) => (
                <TableRow 
                  key={contract.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  {columns.map((col) => (
                    <ResizableTableCell key={col.key} width={col.width}>
                      {getCellValue(contract, col.key)}
                    </ResizableTableCell>
                  ))}
                  <TableCell className="w-[80px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(contract);
                      }}
                    >
                      Szerkesztés
                    </Button>
                  </TableCell>
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
    </LicenseGuard>
  );
};

export default Contracts;
