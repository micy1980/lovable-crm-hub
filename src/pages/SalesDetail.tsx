import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit } from 'lucide-react';
import { TagSelector } from '@/components/shared/TagSelector';
import { useState } from 'react';
import { SalesDialog } from '@/components/sales/SalesDialog';
import { ProjectTasks } from '@/components/projects/ProjectTasks';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { formatCurrency, getNumberFormatSettings } from '@/lib/formatCurrency';

const SalesDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { canEdit } = useReadOnlyMode();
  const { settings: systemSettings } = useSystemSettings();
  const numberFormatSettings = getNumberFormatSettings(systemSettings);

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch partner separately
  const { data: partner } = useQuery({
    queryKey: ['sale-partner', sale?.partner_id],
    queryFn: async () => {
      if (!sale?.partner_id) return null;

      const { data, error } = await supabase
        .from('partners')
        .select('id, name')
        .eq('id', sale.partner_id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!sale?.partner_id,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Betöltés...</div>;
  }

  if (!sale) {
    return <div className="flex items-center justify-center h-full">Értékesítési lehetőség nem található</div>;
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      lead: { label: 'Lead', variant: 'secondary' },
      qualified: { label: 'Minősített', variant: 'default' },
      proposal: { label: 'Ajánlat', variant: 'default' },
      negotiation: { label: 'Tárgyalás', variant: 'default' },
      closed_won: { label: 'Megnyert', variant: 'default' },
      closed_lost: { label: 'Elveszett', variant: 'destructive' },
    };
    
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <LicenseGuard feature="sales">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{sale.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {partner && (
                <span className="text-muted-foreground">Partner: {partner.name}</span>
              )}
              <TagSelector entityType="sales" entityId={sale.id} />
            </div>
          </div>
          <Button onClick={() => setEditDialogOpen(true)} disabled={!canEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Szerkesztés
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Értékesítési információk</CardTitle>
            <CardDescription>Az értékesítési lehetőség részletei</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Státusz</p>
                <div className="mt-1">{getStatusBadge(sale.status || 'lead')}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Üzletág</p>
                <p className="mt-1">{sale.business_unit || 'Nincs megadva'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Várható érték</p>
                <p className="mt-1 font-mono">
                  {sale.expected_value 
                    ? `${formatCurrency(sale.expected_value, sale.currency || 'HUF', numberFormatSettings)} ${sale.currency || 'HUF'}`
                    : 'Nincs megadva'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Várható lezárás</p>
                <p className="mt-1">
                  {sale.expected_close_date 
                    ? new Date(sale.expected_close_date).toLocaleDateString('hu-HU')
                    : 'Nincs megadva'}
                </p>
              </div>
            </div>
            {sale.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leírás</p>
                <p className="mt-1 whitespace-pre-wrap">{sale.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <ProjectTasks salesId={id} />

        <SalesDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          sale={sale}
        />
      </div>
    </LicenseGuard>
  );
};

export default SalesDetail;
