import { useCompany } from '@/contexts/CompanyContext';
import { useCompanyLicenses } from './useCompanyLicenses';

export const useFeatureAccess = () => {
  const { activeCompany } = useCompany();
  const { getLicenseForCompany, isLicenseEffective } = useCompanyLicenses();

  const hasFeatureAccess = (featureCode: string): boolean => {
    if (!activeCompany) return false;
    
    const license = getLicenseForCompany(activeCompany.id);
    
    // If no license or license not effective, no access to features
    if (!license || !isLicenseEffective(license)) {
      return false;
    }

    // Check if the feature is in the license's features array
    return license.features.includes(featureCode);
  };

  return { hasFeatureAccess };
};
