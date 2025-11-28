import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCompanyLicenses } from '@/hooks/useCompanyLicenses';

interface CompanyLicenseWarningProps {
  companyId: string;
}

export const CompanyLicenseWarning = ({ companyId }: CompanyLicenseWarningProps) => {
  const { getLicenseForCompany, isLicenseEffective, getDaysUntilExpiry } = useCompanyLicenses();
  
  const license = getLicenseForCompany(companyId);
  const isEffective = isLicenseEffective(license);
  const daysUntilExpiry = getDaysUntilExpiry(license);

  if (!license || !isEffective) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <AlertCircle className="h-5 w-5 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>
            <p>A licenc lejárt vagy inaktív. Egyes funkciók nem elérhetők.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </TooltipTrigger>
          <TooltipContent>
            <p>A licenc {daysUntilExpiry} napon belül lejár.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
};
