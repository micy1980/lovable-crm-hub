import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { KanbanBoard } from '@/components/projects/KanbanBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LayoutGrid } from 'lucide-react';
import { LicenseGuard } from '@/components/license/LicenseGuard';

const Kanban = () => {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-kanban', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, code')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id,
  });

  return (
    <LicenseGuard feature="projects">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('common.kanban', 'Kanban tábla')}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="project-filter" className="text-sm whitespace-nowrap">
                Projekt szűrő:
              </Label>
              <Select
                value={selectedProjectId || 'all'}
                onValueChange={(value) => setSelectedProjectId(value === 'all' ? undefined : value)}
              >
                <SelectTrigger id="project-filter" className="w-[250px]">
                  <SelectValue placeholder="Összes feladat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes feladat</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code ? `${project.code} - ${project.name}` : project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <KanbanBoard projectId={selectedProjectId} />
          </CardContent>
        </Card>
      </div>
    </LicenseGuard>
  );
};

export default Kanban;
