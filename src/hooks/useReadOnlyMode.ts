import { useLicenseEnforcement } from './useLicenseEnforcement';
import { useUserProfile } from './useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { useToast } from './use-toast';
import { useTranslation } from 'react-i18next';

export const useReadOnlyMode = () => {
  const { isReadOnly } = useLicenseEnforcement();
  const { data: profile } = useUserProfile();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const canEdit = !isReadOnly || isSuperAdmin(profile);
  
  const showReadOnlyWarning = () => {
    if (isReadOnly && !isSuperAdmin(profile)) {
      toast({
        title: t('license.readOnlyMode'),
        description: t('license.expiredMessage'),
        variant: 'destructive',
      });
    }
  };
  
  const checkReadOnly = (callback: () => void) => {
    if (isReadOnly && !isSuperAdmin(profile)) {
      showReadOnlyWarning();
      return;
    }
    callback();
  };

  return {
    isReadOnly,
    canEdit,
    showReadOnlyWarning,
    checkReadOnly,
  };
};
