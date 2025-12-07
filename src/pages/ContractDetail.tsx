import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { hu } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  RefreshCw,
  Lock
} from 'lucide-react';
import { TagSelector } from '@/components/shared/TagSelector';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useContracts, Contract } from '@/hooks/useContracts';
import ContractDialog from '@/components/contracts/ContractDialog';
import { ContractFilesTable } from '@/components/contracts/ContractFilesTable';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { formatCurrency, getNumberFormatSettings } from '@/lib/formatCurrency';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin, isAdminOrAbove } from '@/lib/roleUtils';
import { PasswordConfirmDialog } from '@/components/shared/PasswordConfirmDialog';

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteContract, hardDeleteContract } = useContracts();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);
  
  const { settings: systemSettings } = useSystemSettings();
  const numberFormatSettings = getNumberFormatSettings(systemSettings);
  const { data: profile } = useUserProfile();
  const isSuper = isSuperAdmin(profile);
  const isAdmin = isAdminOrAbove(profile);

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          partner:partners(id, name),
          project:projects(id, name),
          sales:sales(id, name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Contract;
    },
    enabled: !!id,
  });

  const handleDelete = async () => {
    if (!id) return;
    await deleteContract.mutateAsync(id);
    navigate('/contracts');
  };

  const handleHardDelete = async () => {
    if (!id) return;
    await hardDeleteContract.mutateAsync(id);
    navigate('/contracts');
  };

  const isDeleted = !!contract?.deleted_at;

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


  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(parseISO(date), 'yyyy.MM.dd', { locale: hu });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!contract) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Szerződés nem található</p>
          <Button variant="outline" onClick={() => navigate('/contracts')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Vissza
          </Button>
        </div>
      </MainLayout>
    );
  }

  const daysUntilExpiry = contract.expiry_date 
    ? differenceInDays(parseISO(contract.expiry_date), new Date())
    : null;

  return (
    <LicenseGuard feature="documents">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{contract.title}</h1>
                  {contract.restrict_access && <Lock className="h-5 w-5 text-muted-foreground" />}
                  {isDeleted && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Törölt
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {contract.contract_number && (
                    <span className="text-muted-foreground">{contract.contract_number}</span>
                  )}
                  <TagSelector entityType="contract" entityId={contract.id} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Szerkesztés
              </Button>
              {isAdmin && !isDeleted && (
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Törlés
                </Button>
              )}
              {isSuper && isDeleted && (
                <Button variant="destructive" onClick={() => setHardDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Végleges törlés
                </Button>
              )}
            </div>
          </div>

          {/* Status and warnings */}
          <div className="flex items-center gap-4 flex-wrap">
            {getStatusBadge(contract.status)}
            {contract.auto_renewal && (
              <Badge variant="outline" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Automatikus megújítás
              </Badge>
            )}
            {daysUntilExpiry !== null && daysUntilExpiry <= (contract.expiry_warning_days || 30) && daysUntilExpiry > 0 && (
              <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
                <AlertTriangle className="h-3 w-3" />
                {daysUntilExpiry} nap múlva lejár
              </Badge>
            )}
            {daysUntilExpiry !== null && daysUntilExpiry <= 0 && contract.status !== 'expired' && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Lejárt
              </Badge>
            )}
          </div>

          {/* Files Table */}
          <ContractFilesTable 
            contractId={id!} 
            contractTitle={contract.title} 
            isDeleted={isDeleted} 
          />

          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Részletek</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Basic info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Alapadatok
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Típus</span>
                      <span>{contract.contract_type || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Partner</span>
                      <span>{contract.partner?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projekt</span>
                      <span>{contract.project?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Értékesítés</span>
                      <span>{contract.sales?.name || '-'}</span>
                    </div>
                    {contract.description && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">{contract.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Időpontok
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aláírás</span>
                      <span>{formatDate(contract.signed_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hatálybalépés</span>
                      <span>{formatDate(contract.effective_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lejárat</span>
                      <span>{formatDate(contract.expiry_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Felmondási idő</span>
                      <span>{contract.termination_notice_days || 30} nap</span>
                    </div>
                    {contract.auto_renewal && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Megújítási időszak</span>
                        <span>{contract.renewal_period_months || 12} hónap</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Financial */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pénzügyi adatok
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Összérték</span>
                      <span className="font-medium font-mono">{formatCurrency(contract.total_value, contract.currency, numberFormatSettings)} {contract.currency || 'HUF'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fizetési gyakoriság</span>
                      <span>{contract.payment_frequency || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fizetési nap</span>
                      <span>{contract.payment_day || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Számlázás kezdete</span>
                      <span>{formatDate(contract.billing_start_date)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Figyelmeztetések
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lejárati figyelmeztetés</span>
                      <span>{contract.expiry_warning_days || 30} nappal előtte</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Felmondási figyelmeztetés</span>
                      <span>{contract.termination_warning_days || 60} nappal előtte</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Megújítási figyelmeztetés</span>
                      <span>{contract.renewal_warning_days || 45} nappal előtte</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </Tabs>

          {/* Comments Section */}
          {id && (
            <Card>
              <CardContent className="pt-6">
                <CommentsSection entityType="contract" entityId={id} />
              </CardContent>
            </Card>
          )}
        </div>

        <ContractDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          contract={contract}
        />


        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Biztosan törölni szeretné?</AlertDialogTitle>
              <AlertDialogDescription>
                A szerződés törlésre kerül jelölve. Super Admin később véglegesen törölheti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Mégse</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Törlés</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PasswordConfirmDialog
          open={hardDeleteOpen}
          onOpenChange={setHardDeleteOpen}
          onConfirm={handleHardDelete}
          title="Szerződés végleges törlése"
          description="A szerződés és minden hozzá tartozó verzió véglegesen törlésre kerül. Ez a művelet nem visszavonható. Kérjük, adja meg jelszavát a megerősítéshez."
        />
    </LicenseGuard>
  );
};

export default ContractDetail;
