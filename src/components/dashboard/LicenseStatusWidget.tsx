import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const LicenseStatusWidget = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();

  const { data: license } = useQuery({
    queryKey: ['company-license', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return null;

      const { data, error } = await supabase
        .from('company_licenses')
        .select('*')
        .eq('company_id', activeCompany.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany,
  });

  const { data: usedSeats } = useQuery({
    queryKey: ['used-seats', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return 0;

      const { count, error } = await supabase
        .from('user_companies')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeCompany,
  });

  if (!license) {
    return (
      <Card className="border-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Licensz Állapot</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">Nincs Licensz</div>
          <p className="text-xs text-muted-foreground">
            Aktiváljon licenszet a folytatáshoz
          </p>
        </CardContent>
      </Card>
    );
  }

  const validUntil = new Date(license.valid_until);
  const now = new Date();
  const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;
  const isExpired = daysRemaining <= 0;
  const isActive = license.is_active && !isExpired;

  return (
    <Card className={isExpired ? 'border-destructive' : isExpiringSoon ? 'border-warning' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Licensz Állapot</CardTitle>
        {isActive ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{isActive ? 'Aktív' : 'Lejárt'}</div>
            <p className="text-xs text-muted-foreground">
              {isExpired ? 'Licensz lejárt' : `${daysRemaining} nap múlva jár le`}
            </p>
          </div>
          <Badge variant={isActive ? 'default' : 'destructive'}>
            {isActive ? 'Érvényes' : 'Lejárt'}
          </Badge>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Felhasználók:</span>
            <span className="font-medium">{usedSeats} / {license.max_users}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min((usedSeats || 0) / license.max_users * 100, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
