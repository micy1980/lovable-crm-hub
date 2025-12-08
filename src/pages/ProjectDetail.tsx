import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, History } from 'lucide-react';
import { TagSelector } from '@/components/shared/TagSelector';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { ProjectTasks } from '@/components/projects/ProjectTasks';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { useState } from 'react';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ApprovalRequestButton } from '@/components/approval/ApprovalRequestButton';
import { ApprovalHistoryDialog } from '@/components/approval/ApprovalHistoryDialog';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useReadOnlyMode();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approvalHistoryOpen, setApprovalHistoryOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!owner_user_id(full_name, email),
          responsible1:profiles!responsible1_user_id(full_name, email),
          responsible2:profiles!responsible2_user_id(full_name, email)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleDelete = async () => {
    if (!id) return;

    try {
      const { error } = await supabase.rpc('soft_delete_project', {
        _project_id: id
      });

      if (error) throw error;
      
      toast.success('Projekt sikeresen törölve');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error('Hiba történt: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Projekt nem található</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      planning: 'bg-blue-500',
      in_progress: 'bg-green-500',
      on_hold: 'bg-orange-500',
      completed: 'bg-gray-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {project.code && (
                <span className="text-muted-foreground">{project.code}</span>
              )}
              <TagSelector entityType="project" entityId={project.id} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {id && <ApprovalRequestButton entityType="project" entityId={id} />}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setApprovalHistoryOpen(true)}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            disabled={!canEdit}
          >
            <Edit className="mr-2 h-4 w-4" />
            Szerkesztés
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!canEdit}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Törlés
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projekt részletek</CardTitle>
            <CardDescription>Alapvető információk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Státusz</h4>
              <Badge className={getStatusColor(project.status)}>
                {project.status === 'planning' && 'Tervezés'}
                {project.status === 'in_progress' && 'Folyamatban'}
                {project.status === 'on_hold' && 'Felfüggesztve'}
                {project.status === 'completed' && 'Befejezett'}
                {project.status === 'cancelled' && 'Törölve'}
              </Badge>
            </div>

            {project.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Leírás</h4>
                <p className="text-sm">{project.description}</p>
              </div>
            )}

            {project.owner && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Tulajdonos</h4>
                <p className="text-sm">{project.owner.full_name || project.owner.email}</p>
              </div>
            )}

            {(project.responsible1 || project.responsible2) && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Felelősök</h4>
                <div className="space-y-1">
                  {project.responsible1 && (
                    <p className="text-sm">
                      {project.responsible1.full_name || project.responsible1.email}
                    </p>
                  )}
                  {project.responsible2 && (
                    <p className="text-sm">
                      {project.responsible2.full_name || project.responsible2.email}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Létrehozva</h4>
              <p className="text-sm">
                {new Date(project.created_at).toLocaleDateString('hu-HU')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tevékenységek</CardTitle>
            <CardDescription>Legutóbbi frissítések</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Utoljára módosítva: {new Date(project.updated_at).toLocaleDateString('hu-HU')}
            </p>
          </CardContent>
        </Card>
      </div>

      {id && <ProjectTasks projectId={id} canEdit={canEdit} />}

      {/* Comments Section */}
      {id && (
        <Card>
          <CardContent className="pt-6">
            <CommentsSection entityType="project" entityId={id} />
          </CardContent>
        </Card>
      )}

      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretné ezt a projektet? Ez a művelet nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {id && (
        <ApprovalHistoryDialog
          open={approvalHistoryOpen}
          onOpenChange={setApprovalHistoryOpen}
          entityType="project"
          entityId={id}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
