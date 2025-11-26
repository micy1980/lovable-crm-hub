import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useUsers } from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';
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
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [initialCompanyIds, setInitialCompanyIds] = useState<string[]>([]);

  useEffect(() => {
    if (user && open) {
      const userCompanyIds = user?.user_companies?.map((uc: any) => uc.company_id) || [];
      setSelectedCompanyIds(userCompanyIds);
      setInitialCompanyIds(userCompanyIds);
    }
  }, [user, open]);

  const handleToggleCompany = (companyId: string, checked: boolean) => {
    if (checked) {
      setSelectedCompanyIds([...selectedCompanyIds, companyId]);
    } else {
      setSelectedCompanyIds(selectedCompanyIds.filter(id => id !== companyId));
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Find companies to add (in selectedCompanyIds but not in initialCompanyIds)
    const toAdd = selectedCompanyIds.filter(id => !initialCompanyIds.includes(id));
    
    // Find companies to remove (in initialCompanyIds but not in selectedCompanyIds)
    const toRemove = initialCompanyIds.filter(id => !selectedCompanyIds.includes(id));

    // Execute all assignments
    for (const companyId of toAdd) {
      await assignUserToCompany.mutateAsync({ user_id: user.id, company_id: companyId });
    }

    // Execute all removals
    for (const companyId of toRemove) {
      await removeUserFromCompany.mutateAsync({ user_id: user.id, company_id: companyId });
    }

    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vállalatok hozzárendelése</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Vállalat neve</TableHead>
                <TableHead>Adószám</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    {t('users.noCompaniesAvailable')}
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company: any) => (
                  <TableRow key={company.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedCompanyIds.includes(company.id)}
                        onCheckedChange={(checked) => handleToggleCompany(company.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="text-muted-foreground">{company.tax_id || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Mégse
          </Button>
          <Button 
            onClick={handleSave}
            disabled={assignUserToCompany.isPending || removeUserFromCompany.isPending}
          >
            Mentés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
