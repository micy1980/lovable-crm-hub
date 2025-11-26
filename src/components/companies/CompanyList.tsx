import { useState, useMemo } from 'react';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCompanies } from '@/hooks/useCompanies';
import { CompanyForm } from './CompanyForm';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export function CompanyList() {
  const { t } = useTranslation();
  const { companies, isLoading, createCompany, updateCompany, deleteCompany } = useCompanies();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [deletingCompany, setDeletingCompany] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companiesWithUserCount, setCompaniesWithUserCount] = useState<any[]>([]);

  useMemo(() => {
    const fetchUserCounts = async () => {
      const companiesWithCount = await Promise.all(
        companies.map(async (company: any) => {
          const { count } = await supabase
            .from('user_companies')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);
          
          return { ...company, user_count: count || 0 };
        })
      );
      setCompaniesWithUserCount(companiesWithCount);
    };

    if (companies.length > 0) {
      fetchUserCounts();
    }
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companiesWithUserCount.filter((company: any) => {
      const matchesSearch =
        company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.tax_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [companiesWithUserCount, searchQuery]);

  const handleCreate = (data: any) => {
    createCompany.mutate(data, {
      onSuccess: () => setIsCreateOpen(false),
    });
  };

  const handleUpdate = (data: any) => {
    updateCompany.mutate({ id: editingCompany.id, ...data }, {
      onSuccess: () => setEditingCompany(null),
    });
  };

  const handleDelete = () => {
    if (deletingCompany) {
      deleteCompany.mutate(deletingCompany.id, {
        onSuccess: () => setDeletingCompany(null),
      });
    }
  };

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('companies.title')}</CardTitle>
            <CardDescription>{t('companies.description')}</CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('companies.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('companies.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('companies.name')}</TableHead>
                <TableHead>{t('companies.taxId')}</TableHead>
                <TableHead>{t('companies.address')}</TableHead>
                <TableHead>{t('companies.userCount')}</TableHead>
                <TableHead>{t('companies.createdAt')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('companies.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company: any) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.tax_id || '-'}</TableCell>
                    <TableCell>{company.address || '-'}</TableCell>
                    <TableCell>{company.user_count}</TableCell>
                    <TableCell>{format(new Date(company.created_at), 'PP')}</TableCell>
                    <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingCompany(company)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingCompany(company)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('companies.createTitle')}</DialogTitle>
          </DialogHeader>
          <CompanyForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={createCompany.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCompany} onOpenChange={() => setEditingCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('companies.editTitle')}</DialogTitle>
          </DialogHeader>
          <CompanyForm
            initialData={editingCompany}
            onSubmit={handleUpdate}
            onCancel={() => setEditingCompany(null)}
            isSubmitting={updateCompany.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCompany} onOpenChange={() => setDeletingCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('companies.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('companies.deleteConfirm', { name: deletingCompany?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
