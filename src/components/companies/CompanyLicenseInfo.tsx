import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useCompanyLicenses } from '@/hooks/useCompanyLicenses';
import { formatLicenseKey } from '@/lib/license';

interface CompanyLicenseInfoProps {
  companyId: string;
  companyName: string;
  isSuperAdmin: boolean;
}

export const CompanyLicenseInfo = ({ companyId, companyName, isSuperAdmin }: CompanyLicenseInfoProps) => {
  const { getLicenseForCompany, getLicenseStatus, getUsedSeats } = useCompanyLicenses();
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Badge variant={status.status === 'active' ? 'default' : 'secondary'} className={status.color}>
          {status.label}
        </Badge>
      </div>
      {license ? (
        <>
          <span className="text-sm text-muted-foreground">
            {usedSeats} / {license.max_users} felhasználó
            {usedSeats > license.max_users && (
              <span className="text-destructive ml-2 font-medium">
                ⚠️ Túllépve!
              </span>
            )}
          </span>
          {license.license_key && (
            <span className="text-xs text-muted-foreground font-mono">
              {formatLicenseKey(license.license_key)}
            </span>
          )}
        </>
      ) : (
        <span className="text-sm text-muted-foreground">Nincs licenc</span>
      )}
    </div>
  );
};
