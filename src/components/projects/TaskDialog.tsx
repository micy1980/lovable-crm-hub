import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  salesId?: string;
  task?: any;
}

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  deadline: string;
  responsible_user_id: string;
}

export const TaskDialog = ({ open, onOpenChange, projectId, salesId, task }: TaskDialogProps) => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, setValue, watch, reset } = useForm<TaskFormData>({
    defaultValues: task || {
      title: '',
      description: '',
      status: 'pending',
      deadline: '',
      responsible_user_id: '',
    }
  });

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

  const onSubmit = async (data: TaskFormData) => {
    if (!activeCompany) return;

    try {
      const taskData = {
        ...data,
        company_id: activeCompany.id,
        project_id: projectId || null,
        sales_id: salesId || null,
        responsible_user_id: data.responsible_user_id || null,
        deadline: data.deadline || null,
      };

      if (task) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id);

        if (error) throw error;
        toast.success('Feladat sikeresen frissítve');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);

        if (error) throw error;
        toast.success('Feladat sikeresen létrehozva');
      }

      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sales-tasks'] });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error('Hiba történt: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Feladat szerkesztése' : 'Új feladat létrehozása'}</DialogTitle>
          <DialogDescription>
            Töltse ki a feladat részleteit
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Cím *</Label>
            <Input
              id="title"
              {...register('title', { required: true })}
              placeholder="Feladat címe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Leírás</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Feladat részletes leírása"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Státusz</Label>
              <Select
                value={watch('status') || 'pending'}
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Függőben</SelectItem>
                  <SelectItem value="in_progress">Folyamatban</SelectItem>
                  <SelectItem value="completed">Befejezett</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Határidő</Label>
              <Input
                id="deadline"
                type="date"
                {...register('deadline')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsible_user_id">Felelős</Label>
            <Select
              value={watch('responsible_user_id') || 'none'}
              onValueChange={(value) => setValue('responsible_user_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Válasszon felelőst" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nincs</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {task ? 'Mentés' : 'Létrehozás'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
