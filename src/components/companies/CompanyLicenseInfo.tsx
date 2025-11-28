import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCompanyLicenses } from '@/hooks/useCompanyLicenses';
import { Edit } from 'lucide-react';
import { CompanyLicenseDialog } from './CompanyLicenseDialog';

interface CompanyLicenseInfoProps {
  companyId: string;
  companyName: string;
  isSuperAdmin: boolean;
}

export const CompanyLicenseInfo = ({ companyId, companyName, isSuperAdmin }: CompanyLicenseInfoProps) => {
  const { getLicenseForCompany, getLicenseStatus, getUsedSeats } = useCompanyLicenses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usedSeats, setUsedSeats] = useState<number>(0);
  
  const license = getLicenseForCompany(companyId);
  const status = getLicenseStatus(license);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const seats = await getUsedSeats(companyId);
        setUsedSeats(seats);
      } catch (error) {
        console.error('Error fetching seats:', error);
      }
    };
    fetchSeats();
  }, [companyId, license]);

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{license?.license_type || 'Nincs licenc'}</span>
          <Badge variant={status.status === 'active' ? 'default' : 'secondary'} className={status.color}>
            {status.label}
          </Badge>
        </div>
        {license && (
          <span className="text-sm text-muted-foreground">
            {usedSeats} / {license.max_users} felhasználó
            {usedSeats > license.max_users && (
              <span className="text-destructive ml-2 font-medium">
                ⚠️ Túllépve!
              </span>
            )}
          </span>
        )}
      </div>
      {isSuperAdmin && (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDialogOpen(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <CompanyLicenseDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            companyId={companyId}
            companyName={companyName}
          />
        </>
      )}
    </div>
  );
};
