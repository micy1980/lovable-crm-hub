import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, AlertCircle, Calendar, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  deadline: string | null;
  responsible_user_id?: string | null;
  project_id?: string | null;
  sales_id?: string | null;
}

interface TaskViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'completed':
      return { 
        icon: CheckCircle, 
        label: 'Befejezett', 
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      };
    case 'in_progress':
      return { 
        icon: Clock, 
        label: 'Folyamatban', 
        variant: 'default' as const,
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      };
    case 'pending':
    default:
      return { 
        icon: AlertCircle, 
        label: 'Függőben', 
        variant: 'default' as const,
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      };
  }
};

export const TaskViewSheet = ({ open, onOpenChange, task }: TaskViewSheetProps) => {
  const { t } = useTranslation();

  // Fetch responsible user details
  const { data: responsibleUser } = useQuery({
    queryKey: ['user-profile', task?.responsible_user_id],
    queryFn: async () => {
      if (!task?.responsible_user_id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', task.responsible_user_id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!task?.responsible_user_id && open,
  });

  // Fetch project details if exists
  const { data: project } = useQuery({
    queryKey: ['project', task?.project_id],
    queryFn: async () => {
      if (!task?.project_id) return null;
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, code')
        .eq('id', task.project_id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!task?.project_id && open,
  });

  // Fetch sales details if exists
  const { data: sales } = useQuery({
    queryKey: ['sales', task?.sales_id],
    queryFn: async () => {
      if (!task?.sales_id) return null;
      
      const { data, error } = await supabase
        .from('sales')
        .select('id, name')
        .eq('id', task.sales_id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!task?.sales_id && open,
  });

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusConfig = task ? getStatusConfig(task.status) : getStatusConfig('pending');
  const StatusIcon = statusConfig.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        {!task ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Nincs kiválasztott feladat</p>
          </div>
        ) : (
          <>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            {task.title}
          </SheetTitle>
          <SheetDescription>
            {t('calendar.taskDetails', 'Feladat részletei')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">{t('common.status', 'Státusz')}</Label>
            <div>
              <Badge className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">{t('common.deadline', 'Határidő')}</Label>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDateTime(task.deadline)}</span>
            </div>
          </div>

          {/* Responsible User */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">{t('common.responsible', 'Felelős')}</Label>
            <div className="flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{responsibleUser ? (responsibleUser.full_name || responsibleUser.email) : '-'}</span>
            </div>
          </div>

          {/* Project */}
          {project && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">{t('common.project', 'Projekt')}</Label>
              <div className="text-foreground">
                {project.code ? `[${project.code}] ` : ''}{project.name}
              </div>
            </div>
          )}

          {/* Sales */}
          {sales && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">{t('common.sales', 'Értékesítés')}</Label>
              <div className="text-foreground">
                {sales.name}
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">{t('common.description', 'Leírás')}</Label>
              <div className="text-foreground whitespace-pre-wrap rounded-md bg-muted/50 p-3">
                {task.description}
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </SheetContent>
    </Sheet>
  );
};
