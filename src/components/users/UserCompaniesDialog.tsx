import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUsers } from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UserCompaniesDialogProps {
  user: any;
  open: boolean;
  onClose: () => void;
}

export function UserCompaniesDialog({ user, open, onClose }: UserCompaniesDialogProps) {
  const { t } = useTranslation();
  const { assignUserToCompany, removeUserFromCompany } = useUsers();
  const { companies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const userCompanyIds = user?.user_companies?.map((uc: any) => uc.company_id) || [];
  const availableCompanies = companies.filter(
    (c: any) => !userCompanyIds.includes(c.id)
  );

  const handleAssign = () => {
    if (selectedCompanyId && user) {
      assignUserToCompany.mutate({
        user_id: user.id,
        company_id: selectedCompanyId,
      });
      setSelectedCompanyId('');
    }
  };

  const handleRemove = (companyId: string) => {
    if (user) {
      removeUserFromCompany.mutate({
        user_id: user.id,
        company_id: companyId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('users.manageCompanies')} - {user?.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">{t('users.assignedCompanies')}</h4>
            <div className="flex flex-wrap gap-2">
              {user?.user_companies?.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('users.noCompanies')}</p>
              ) : (
                user?.user_companies?.map((uc: any) => (
                  <Badge key={uc.company_id} variant="secondary" className="gap-1">
                    {uc.companies?.name}
                    <button
                      onClick={() => handleRemove(uc.company_id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {availableCompanies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t('users.addCompany')}</h4>
              <div className="flex gap-2">
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('users.selectCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedCompanyId || assignUserToCompany.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
