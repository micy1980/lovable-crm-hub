import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, UserPlus, Mail, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useEvents } from '@/hooks/useEvents';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: any;
  defaultDate?: Date;
  defaultTime?: string;
}

interface Participant {
  type: 'internal' | 'external';
  user_id?: string;
  email?: string;
  name?: string;
}

interface FormData {
  title: string;
  description: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location: string;
  project_id: string;
  sales_id: string;
  responsible_user_id: string;
  is_all_day: boolean;
}

export const EventDialog = ({
  open,
  onOpenChange,
  event,
  defaultDate,
  defaultTime,
}: EventDialogProps) => {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const { createEvent, updateEvent } = useEvents();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [externalEmail, setExternalEmail] = useState('');
  const [externalName, setExternalName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      start_date: '',
      start_time: '09:00',
      end_date: '',
      end_time: '10:00',
      location: '',
      project_id: '',
      sales_id: '',
      responsible_user_id: '',
      is_all_day: false,
    }
  });

  const isAllDay = watch('is_all_day');
  const projectId = watch('project_id');
  const salesId = watch('sales_id');
  const responsibleUserId = watch('responsible_user_id');

  const { data: users = [] } = useQuery({
    queryKey: ['company-users-for-events', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .is('deleted_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id && open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-events', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id && open,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales-for-events', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from('sales')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id && open,
  });

  useEffect(() => {
    if (open) {
      if (event) {
        const startDate = event.start_time ? new Date(event.start_time) : null;
        const endDate = event.end_time ? new Date(event.end_time) : null;
        
        reset({
          title: event.title || '',
          description: event.description || '',
          start_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
          start_time: startDate ? format(startDate, 'HH:mm') : '09:00',
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : '',
          end_time: endDate ? format(endDate, 'HH:mm') : '10:00',
          location: event.location || '',
          project_id: event.project_id || '',
          sales_id: event.sales_id || '',
          responsible_user_id: event.responsible_user_id || '',
          is_all_day: event.is_all_day || false,
        });
      } else {
        const startDate = defaultDate || new Date();
        const startTimeStr = defaultTime || '09:00';
        
        reset({
          title: '',
          description: '',
          start_date: format(startDate, 'yyyy-MM-dd'),
          start_time: startTimeStr,
          end_date: '',
          end_time: '10:00',
          location: '',
          project_id: '',
          sales_id: '',
          responsible_user_id: '',
          is_all_day: false,
        });
        setParticipants([]);
      }
    }
  }, [open, event, defaultDate, defaultTime, reset]);

  const onSubmit = async (data: FormData) => {
    // Build ISO datetime strings
    let startTimeISO = '';
    let endTimeISO = '';

    if (data.start_date) {
      if (data.is_all_day) {
        startTimeISO = new Date(`${data.start_date}T00:00:00`).toISOString();
      } else {
        startTimeISO = new Date(`${data.start_date}T${data.start_time || '09:00'}:00`).toISOString();
      }
    }

    if (data.end_date) {
      if (data.is_all_day) {
        endTimeISO = new Date(`${data.end_date}T23:59:59`).toISOString();
      } else {
        endTimeISO = new Date(`${data.end_date}T${data.end_time || '10:00'}:00`).toISOString();
      }
    }

    const formData = {
      title: data.title,
      description: data.description,
      start_time: startTimeISO,
      end_time: endTimeISO || null,
      location: data.location,
      project_id: data.project_id || null,
      sales_id: data.sales_id || null,
      responsible_user_id: data.responsible_user_id || null,
      is_all_day: data.is_all_day,
      participants: participants.map(p => ({
        user_id: p.user_id,
        external_email: p.email,
        external_name: p.name,
      })),
    };

    if (event) {
      await updateEvent.mutateAsync({ id: event.id, data: formData });
    } else {
      await createEvent.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  const addInternalParticipant = () => {
    if (!selectedUserId) return;
    const user = users.find(u => u.id === selectedUserId);
    if (user && !participants.some(p => p.user_id === selectedUserId)) {
      setParticipants([...participants, { 
        type: 'internal', 
        user_id: user.id, 
        name: user.full_name || user.email 
      }]);
      setSelectedUserId('');
    }
  };

  const addExternalParticipant = () => {
    if (!externalEmail) return;
    if (!participants.some(p => p.email === externalEmail)) {
      setParticipants([...participants, { 
        type: 'external', 
        email: externalEmail, 
        name: externalName || externalEmail 
      }]);
      setExternalEmail('');
      setExternalName('');
    }
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const availableUsers = users.filter(u => !participants.some(p => p.user_id === u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? t('events.edit') : t('events.create')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Created at - read only, only for existing events */}
          {event?.created_at && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('common.createdAt', 'Létrehozva')}</Label>
              <Input
                value={format(new Date(event.created_at), 'yyyy.MM.dd HH:mm:ss')}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">{t('events.title')} *</Label>
            <Input
              id="title"
              {...register('title', { required: true })}
              placeholder={t('events.titlePlaceholder')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{t('common.required')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('events.description')}</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={t('events.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_all_day"
              checked={isAllDay}
              onCheckedChange={(checked) => setValue('is_all_day', checked)}
            />
            <Label htmlFor="is_all_day">{t('events.allDay')}</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('events.startTime')} *</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  {...register('start_date', { required: true })}
                  className="flex-1"
                />
                {!isAllDay && (
                  <Input
                    type="time"
                    {...register('start_time')}
                    className="w-28"
                  />
                )}
              </div>
              {errors.start_date && (
                <p className="text-sm text-destructive">{t('common.required')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('events.endTime')}</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  {...register('end_date')}
                  className="flex-1"
                />
                {!isAllDay && (
                  <Input
                    type="time"
                    {...register('end_time')}
                    className="w-28"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t('events.location')}</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder={t('events.locationPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('events.project')}</Label>
              <Select
                value={projectId || '_none_'}
                onValueChange={(v) => setValue('project_id', v === '_none_' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('events.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">{t('events.noProject')}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('events.sales')}</Label>
              <Select
                value={salesId || '_none_'}
                onValueChange={(v) => setValue('sales_id', v === '_none_' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('events.selectSales')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">{t('events.noSales')}</SelectItem>
                  {sales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('events.responsibleUser')}</Label>
            <Select
              value={responsibleUserId || '_none_'}
              onValueChange={(v) => setValue('responsible_user_id', v === '_none_' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('events.selectResponsible')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">{t('events.noResponsible')}</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('events.participants')}
            </Label>

            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('events.selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addInternalParticipant}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t('events.externalName')}
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="email"
                placeholder={t('events.externalEmail')}
                value={externalEmail}
                onChange={(e) => setExternalEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addExternalParticipant}>
                <Mail className="h-4 w-4" />
              </Button>
            </div>

            {participants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {participants.map((p, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    {p.type === 'internal' ? <UserPlus className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                    {p.name || p.email}
                    <button type="button" onClick={() => removeParticipant(i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
              {event ? t('common.save') : t('events.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};