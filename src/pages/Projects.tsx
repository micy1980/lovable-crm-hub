import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

const Projects = () => {
  const { activeCompany } = useCompany();

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
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>
              Please select a company to view projects.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage projects for {activeCompany.name}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            Projects in {activeCompany.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading projects...
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    {project.code && (
                      <p className="text-sm text-muted-foreground">Code: {project.code}</p>
                    )}
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                    )}
                    {project.status && (
                      <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded-md text-xs mt-2">
                        {project.status}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No projects found. Create your first project to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Projects;
