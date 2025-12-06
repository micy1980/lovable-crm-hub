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
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ColorPicker } from '@/components/shared/ColorPicker';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: any;
}

interface ProjectFormData {
  name: string;
  code: string;
  description: string;
  status: string;
  owner_user_id: string;
  responsible1_user_id: string;
  responsible2_user_id: string;
  partner_id: string;
}

export const ProjectDialog = ({ open, onOpenChange, project }: ProjectDialogProps) => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const { register, handleSubmit, setValue, watch, reset } = useForm<ProjectFormData>({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      status: 'planning',
      owner_user_id: '',
      responsible1_user_id: '',
      responsible2_user_id: '',
      partner_id: '',
    }
  });

  const [taskColor, setTaskColor] = useState<string | null>(null);
  const [eventColor, setEventColor] = useState<string | null>(null);

  // Reset form when dialog opens or project changes
  useEffect(() => {
    if (open) {
      reset({
        name: project?.name || '',
        code: project?.code || '',
        description: project?.description || '',
        status: project?.status || 'planning',
        owner_user_id: project?.owner_user_id || '',
        responsible1_user_id: project?.responsible1_user_id || '',
        responsible2_user_id: project?.responsible2_user_id || '',
        partner_id: project?.partner_id || '',
      });
      setTaskColor(project?.task_color || null);
      setEventColor(project?.event_color || null);
    }
  }, [open, project, reset]);

  // Fetch users for dropdowns
  const { data: users = [] } = useQuery({
    queryKey: ['company-users', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      
      const { data, error } = await supabase
        .from('user_company_permissions')
        .select('user_id, profiles:user_id(id, full_name, email)')
        .eq('company_id', activeCompany.id);
      
      if (error) throw error;
      return data.map((item: any) => item.profiles);
    },
    enabled: !!activeCompany && open,
  });

  // Fetch partners for dropdown
  const { data: partners = [] } = useQuery({
    queryKey: ['company-partners', activeCompany?.id],
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

  const onSubmit = async (data: ProjectFormData) => {
    if (!activeCompany) return;

    try {
      const projectData = {
        ...data,
        company_id: activeCompany.id,
        owner_user_id: data.owner_user_id || null,
        responsible1_user_id: data.responsible1_user_id || null,
        responsible2_user_id: data.responsible2_user_id || null,
        partner_id: data.partner_id || null,
        task_color: taskColor,
        event_color: eventColor,
      };

      if (project) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', project.id);

        if (error) throw error;
        toast.success('Projekt sikeresen frissítve');
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([projectData]);

        if (error) throw error;
        toast.success('Projekt sikeresen létrehozva');
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project?.id] });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast.error('Hiba történt: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Projekt szerkesztése' : 'Új projekt létrehozása'}</DialogTitle>
          <DialogDescription>
            Töltse ki a projekt részleteit. A csillaggal jelölt mezők kötelezők.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Név *</Label>
              <Input
                id="name"
                {...register('name', { required: true })}
                placeholder="Projekt neve"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Kód</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="PROJ-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Leírás</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Projekt részletes leírása"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Státusz</Label>
            <Select
              value={watch('status') || 'planning'}
              onValueChange={(value) => setValue('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Tervezés</SelectItem>
                <SelectItem value="in_progress">Folyamatban</SelectItem>
                <SelectItem value="on_hold">Felfüggesztve</SelectItem>
                <SelectItem value="completed">Befejezett</SelectItem>
                <SelectItem value="cancelled">Törölve</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner_id">Partner</Label>
            <Select
              value={watch('partner_id') || 'none'}
              onValueChange={(value) => setValue('partner_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Válasszon partnert" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nincs</SelectItem>
                {partners.map((partner: any) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_user_id">Tulajdonos</Label>
            <Select
              value={watch('owner_user_id') || 'none'}
              onValueChange={(value) => setValue('owner_user_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Válasszon tulajdonost" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsible1_user_id">Felelős 1</Label>
              <Select
                value={watch('responsible1_user_id') || 'none'}
                onValueChange={(value) => setValue('responsible1_user_id', value === 'none' ? '' : value)}
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

            <div className="space-y-2">
              <Label htmlFor="responsible2_user_id">Felelős 2</Label>
              <Select
                value={watch('responsible2_user_id') || 'none'}
                onValueChange={(value) => setValue('responsible2_user_id', value === 'none' ? '' : value)}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ColorPicker 
              value={taskColor} 
              onChange={setTaskColor} 
              label="Feladatok színe"
            />
            <ColorPicker 
              value={eventColor} 
              onChange={setEventColor} 
              label="Események színe"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {project ? 'Mentés' : 'Létrehozás'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
