import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  salesId?: string;
  partnerId?: string;
  task?: any;
  defaultDate?: Date;
  defaultTime?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  deadline_date: string;
  deadline_time: string;
  responsible_user_id: string;
  is_all_day: boolean;
  project_id: string;
  sales_id: string;
  partner_id: string;
}

export const TaskDialog = ({ open, onOpenChange, projectId, salesId, partnerId, task, defaultDate, defaultTime }: TaskDialogProps) => {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      deadline_date: '',
      deadline_time: '',
      responsible_user_id: '',
      is_all_day: false,
      project_id: '',
      sales_id: '',
      partner_id: '',
    }
  });

  const isAllDay = watch('is_all_day');
  const selectedProjectId = watch('project_id');
  const selectedSalesId = watch('sales_id');

  // Update form when task changes or dialog opens
  useEffect(() => {
    if (open && task) {
      const deadlineDate = task.deadline ? new Date(task.deadline) : null;
      reset({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        deadline_date: deadlineDate ? format(deadlineDate, 'yyyy-MM-dd') : '',
        deadline_time: deadlineDate && !task.is_all_day ? format(deadlineDate, 'HH:mm') : '',
        responsible_user_id: task.responsible_user_id || '',
        is_all_day: task.is_all_day || false,
        project_id: task.project_id || projectId || '',
        sales_id: task.sales_id || salesId || '',
        partner_id: task.partner_id || partnerId || '',
      });
    } else if (open && !task) {
      // For new tasks, get current user ID to set as default responsible
      supabase.auth.getUser().then(({ data }) => {
        const currentUserId = data.user?.id || '';
        reset({
          title: '',
          description: '',
          status: 'pending',
          deadline_date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : '',
          deadline_time: defaultTime || '',
          responsible_user_id: currentUserId,
          is_all_day: false,
          project_id: projectId || '',
          sales_id: salesId || '',
          partner_id: partnerId || '',
        });
      });
    }
  }, [open, task, reset, defaultDate, defaultTime, projectId, salesId, partnerId]);

  // Fetch users for responsible dropdown using RPC function
  const { data: users = [] } = useQuery({
    queryKey: ['company-users', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      
      const { data, error } = await supabase
        .rpc('get_company_users_for_assignment', { _company_id: activeCompany.id });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany && open,
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-tasks', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany && open,
  });

  // Fetch sales for dropdown
  const { data: sales = [] } = useQuery({
    queryKey: ['sales-for-tasks', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      const { data, error } = await supabase
        .from('sales')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany && open,
  });

  // Fetch partners for dropdown
  const { data: partners = [] } = useQuery({
    queryKey: ['partners-for-tasks', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      const { data, error } = await supabase
        .from('partners')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany && open,
  });

  const formatCreatedAt = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return format(date, 'yyyy.MM.dd HH:mm:ss');
  };

  const onSubmit = async (data: TaskFormData) => {
    if (!activeCompany) return;

    try {
      // Combine date and time for deadline
      let deadlineISO: string | null = null;
      if (data.deadline_date) {
        if (data.is_all_day) {
          // For all-day tasks, set time to 00:00:00
          deadlineISO = new Date(`${data.deadline_date}T00:00:00`).toISOString();
        } else {
          const timeStr = data.deadline_time || '00:00';
          deadlineISO = new Date(`${data.deadline_date}T${timeStr}:00`).toISOString();
        }
      }

      // Get current user id
      const { data: { user } } = await supabase.auth.getUser();

      const taskData = {
        title: data.title,
        description: data.description,
        status: data.status,
        company_id: activeCompany.id,
        project_id: data.project_id || null,
        sales_id: data.sales_id || null,
        partner_id: data.partner_id || null,
        responsible_user_id: data.responsible_user_id || null,
        deadline: deadlineISO,
        is_all_day: data.is_all_day,
      };

      if (task) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id);

        if (error) throw error;
        toast.success(t('tasks.updated', 'Feladat sikeresen frissítve'));
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([{ ...taskData, created_by: user?.id }]);

        if (error) throw error;
        toast.success(t('tasks.created', 'Feladat sikeresen létrehozva'));
      }

      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sales-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error(t('common.error', 'Hiba történt') + ': ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_task', {
        _task_id: task.id
      });

      if (error) throw error;
      
      toast.success(t('tasks.deleted', 'Feladat sikeresen törölve'));
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sales-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(t('tasks.deleteError', 'Nincs jogosultságod törölni ezt a feladatot'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? t('tasks.edit', 'Feladat szerkesztése') : t('tasks.create', 'Új feladat létrehozása')}</DialogTitle>
          <DialogDescription>
            {t('tasks.fillDetails', 'Töltse ki a feladat részleteit')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Created at - read only, only for existing tasks */}
          {task?.created_at && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('common.createdAt', 'Létrehozva')}</Label>
              <Input
                value={formatCreatedAt(task.created_at)}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">{t('common.title', 'Cím')} *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Kötelező mező' })}
              placeholder={t('tasks.titlePlaceholder', 'Feladat címe')}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description', 'Leírás')}</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={t('tasks.descriptionPlaceholder', 'Feladat részletes leírása')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">{t('tasks.statusLabel', 'Státusz')}</Label>
              <Select
                value={watch('status') || 'pending'}
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('tasks.status.pending', 'Függőben')}</SelectItem>
                  <SelectItem value="in_progress">{t('tasks.status.inProgress', 'Folyamatban')}</SelectItem>
                  <SelectItem value="completed">{t('tasks.status.completed', 'Befejezett')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('common.deadline', 'Határidő')} *</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  {...register('deadline_date', { required: 'Kötelező mező' })}
                  className={`flex-1 ${errors.deadline_date ? 'border-destructive' : ''}`}
                />
                <Input
                  type="time"
                  {...register('deadline_time')}
                  className="w-24"
                  disabled={isAllDay}
                />
              </div>
              {errors.deadline_date && <p className="text-sm text-destructive">{errors.deadline_date.message}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_all_day"
              checked={isAllDay}
              onCheckedChange={(checked) => setValue('is_all_day', checked)}
            />
            <Label htmlFor="is_all_day">{t('calendar.allDay', 'Egész napos')}</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('projects.title', 'Projekt')}</Label>
              <Select
                value={selectedProjectId || '_none_'}
                onValueChange={(v) => setValue('project_id', v === '_none_' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.selectProject', 'Válasszon projektet')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">{t('common.none', 'Nincs')}</SelectItem>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('sales.title', 'Értékesítés')}</Label>
              <Select
                value={selectedSalesId || '_none_'}
                onValueChange={(v) => setValue('sales_id', v === '_none_' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.selectSales', 'Válasszon értékesítést')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">{t('common.none', 'Nincs')}</SelectItem>
                  {sales.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('partners.title', 'Partner')}</Label>
            <Select
              value={watch('partner_id') || '_none_'}
              onValueChange={(v) => setValue('partner_id', v === '_none_' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectPartner', 'Válasszon partnert')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">{t('common.none', 'Nincs')}</SelectItem>
                {partners.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsible_user_id">{t('common.responsible', 'Felelős')}</Label>
            <Select
              value={watch('responsible_user_id') || 'none'}
              onValueChange={(value) => setValue('responsible_user_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectResponsible', 'Válasszon felelőst')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('common.none', 'Nincs')}</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {task && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete', 'Törlés')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Mégse')}
              </Button>
              <Button type="submit">
                {task ? t('common.save', 'Mentés') : t('common.create', 'Létrehozás')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tasks.deleteConfirmTitle', 'Feladat törlése')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tasks.deleteConfirmDescription', 'Biztosan törölni szeretnéd ezt a feladatot? Ez a művelet nem vonható vissza.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Mégse')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('common.deleting', 'Törlés...') : t('common.delete', 'Törlés')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};