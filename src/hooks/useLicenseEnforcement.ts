import { useCompany } from '@/contexts/CompanyContext';
import { useCompanyLicenses } from './useCompanyLicenses';
import { useMemo } from 'react';

export interface LicenseStatus {
  isLicensed: boolean;
  isExpired: boolean;
  isActive: boolean;
  isReadOnly: boolean;
  maxUsers: number;
  usedSeats: number;
  daysUntilExpiry: number | null;
  features: {
    partners: boolean;
    sales: boolean;
    calendar: boolean;
    projects: boolean;
    documents: boolean;
    audit: boolean;
    my_items: boolean;
  };
  validFrom: string | null;
  validUntil: string | null;
  canAddUsers: boolean;
}

export const useLicenseEnforcement = (): LicenseStatus => {
  const { activeCompany } = useCompany();
  const { getLicenseForCompany, isLicenseEffective, getDaysUntilExpiry } = useCompanyLicenses();
  
  const licenseStatus = useMemo(() => {
    if (!activeCompany) {
      return {
        isLicensed: false,
        isExpired: true,
        isActive: false,
        isReadOnly: true,
        maxUsers: 0,
        usedSeats: 0,
        daysUntilExpiry: null,
        features: {
          partners: false,
          sales: false,
          calendar: false,
          projects: false,
          documents: false,
          audit: false,
          my_items: false,
        },
        validFrom: null,
        validUntil: null,
        canAddUsers: false,
      };
    }
    
    const license = getLicenseForCompany(activeCompany.id);
    const isEffective = isLicenseEffective(license);
    const daysLeft = getDaysUntilExpiry(license);
    
    if (!license) {
      return {
        isLicensed: false,
        isExpired: true,
        isActive: false,
        isReadOnly: true,
        maxUsers: 0,
        usedSeats: 0,
        daysUntilExpiry: null,
        features: {
          partners: false,
          sales: false,
          calendar: false,
          projects: false,
          documents: false,
          audit: false,
          my_items: false,
        },
        validFrom: null,
        validUntil: null,
        canAddUsers: false,
      };
    }

    const now = new Date();
    const validUntil = new Date(license.valid_until);
    const isExpired = now > validUntil || !license.is_active;

    // Parse features from the license
    const features = Array.isArray(license.features) ? license.features : [];
    const featureMap = {
      partners: features.includes('partners'),
      sales: features.includes('sales'),
      calendar: features.includes('calendar'),
      projects: features.includes('projects'),
      documents: features.includes('documents'),
      audit: features.includes('audit'),
      my_items: features.includes('my_items'),
    };

    return {
      isLicensed: true,
      isExpired,
      isActive: isEffective,
      isReadOnly: isExpired || !isEffective,
      maxUsers: license.max_users,
      usedSeats: 0, // This will be updated by components that need it
      daysUntilExpiry: daysLeft,
      features: featureMap,
      validFrom: license.valid_from,
      validUntil: license.valid_until,
      canAddUsers: isEffective && !isExpired,
    };
  }, [activeCompany, getLicenseForCompany, isLicenseEffective, getDaysUntilExpiry]);

  return licenseStatus;
};