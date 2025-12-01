import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Link, useNavigate } from 'react-router-dom';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { useState } from 'react';
import { ExportMenu } from '@/components/shared/ExportMenu';

const Projects = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { canEdit } = useReadOnlyMode();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany,
  });

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t('projects.noCompanySelected')}</CardTitle>
            <CardDescription>
              {t('projects.noCompanyMessage')}
            </CardDescription>
          </CardHeader>
          {isSuperAdmin(profile) && (
            <CardContent>
              <Link to="/settings">
                <Button className="w-full">{t('projects.createCompany')}</Button>
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <LicenseGuard feature="projects">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('projects.title')}</h1>
          <p className="text-muted-foreground">
            {t('projects.description', { companyName: activeCompany.name })}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            data={projects || []}
            columns={[
              { header: 'Név', key: 'name' },
              { header: 'Kód', key: 'code' },
              { header: 'Leírás', key: 'description' },
              { header: 'Státusz', key: 'status' },
              { header: 'Létrehozva', key: 'created_at' },
            ]}
            title="Projektek"
          />
          <Button onClick={() => setDialogOpen(true)} disabled={!canEdit}>
            <Plus className="mr-2 h-4 w-4" />
            {t('projects.newProject')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('projects.allProjects')}</CardTitle>
          <CardDescription>
            {t('projects.projectsIn', { companyName: activeCompany.name })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('projects.loadingProjects')}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    {project.code && (
                      <p className="text-sm text-muted-foreground">{t('projects.code')}: {project.code}</p>
                    )}
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                    )}
                    {project.status && (
                      <Badge variant="secondary" className="mt-2">
                        {project.status === 'planning' && 'Tervezés'}
                        {project.status === 'in_progress' && 'Folyamatban'}
                        {project.status === 'on_hold' && 'Felfüggesztve'}
                        {project.status === 'completed' && 'Befejezett'}
                        {project.status === 'cancelled' && 'Törölve'}
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}>
                    {t('common.viewDetails')}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('projects.noProjectsFound')}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </LicenseGuard>
  );
};

export default Projects;
