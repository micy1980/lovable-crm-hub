import { Badge } from '@/components/ui/badge';
import { useCompanyLicenses } from '@/hooks/useCompanyLicenses';

interface CompanyLicenseInfoProps {
  companyId: string;
  companyName: string;
  isSuperAdmin: boolean;
}

export const CompanyLicenseInfo = ({ companyId, companyName, isSuperAdmin }: CompanyLicenseInfoProps) => {
  const { getLicenseForCompany, getLicenseStatus } = useCompanyLicenses();
  
  const license = getLicenseForCompany(companyId);
  const status = getLicenseStatus(license);

  const getBadgeVariant = () => {
    if (status.status === 'active') {
      const daysUntilExpiry = license ? Math.floor((new Date(license.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
      if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
        return 'default';
      }
      return 'default';
    }
    return 'secondary';
  };

  const getBadgeColor = () => {
    if (status.status === 'active') {
      const daysUntilExpiry = license ? Math.floor((new Date(license.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
      if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      }
      return 'bg-green-500 hover:bg-green-600 text-white';
    }
    return 'bg-red-500 hover:bg-red-600 text-white';
  };

  return (
    <Badge variant={getBadgeVariant()} className={getBadgeColor()}>
      {status.label}
    </Badge>
  );
};
