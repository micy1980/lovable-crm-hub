import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, X, UserPlus, Mail, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useEvents, EventFormData } from '@/hooks/useEvents';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

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

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<EventFormData>();

  const isAllDay = watch('is_all_day');
  const startTime = watch('start_time');

  // Fetch users for participant selection
  const { data: users } = useQuery({
    queryKey: ['company-users', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id && open,
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id && open,
  });

  // Fetch sales
  const { data: sales } = useQuery({
    queryKey: ['sales', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from('sales')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id && open,
  });

  useEffect(() => {
    if (open) {
      if (event) {
        reset({
          title: event.title,
          description: event.description || '',
          start_time: event.start_time,
          end_time: event.end_time || '',
          location: event.location || '',
          project_id: event.project_id || '',
          sales_id: event.sales_id || '',
          responsible_user_id: event.responsible_user_id || '',
          is_all_day: event.is_all_day || false,
        });
      } else {
        const startDate = defaultDate || new Date();
        const startTimeStr = defaultTime || '09:00';
        const [hours, minutes] = startTimeStr.split(':').map(Number);
        startDate.setHours(hours, minutes, 0, 0);
        
        reset({
          title: '',
          description: '',
          start_time: startDate.toISOString(),
          end_time: '',
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

  const onSubmit = async (data: EventFormData) => {
    const formData = {
      ...data,
      project_id: data.project_id || null,
      sales_id: data.sales_id || null,
      responsible_user_id: data.responsible_user_id || null,
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
    const user = users?.find(u => u.id === selectedUserId);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? t('events.edit') : t('events.create')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startTime && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startTime
                      ? format(new Date(startTime), isAllDay ? 'yyyy.MM.dd' : 'yyyy.MM.dd HH:mm')
                      : t('events.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startTime ? new Date(startTime) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const current = startTime ? new Date(startTime) : new Date();
                        date.setHours(current.getHours(), current.getMinutes());
                        setValue('start_time', date.toISOString());
                      }
                    }}
                  />
                  {!isAllDay && (
                    <div className="p-3 border-t">
                      <Input
                        type="time"
                        value={startTime ? format(new Date(startTime), 'HH:mm') : '09:00'}
                        onChange={(e) => {
                          const date = startTime ? new Date(startTime) : new Date();
                          const [hours, minutes] = e.target.value.split(':').map(Number);
                          date.setHours(hours, minutes);
                          setValue('start_time', date.toISOString());
                        }}
                      />
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t('events.endTime')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !watch('end_time') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch('end_time')
                      ? format(new Date(watch('end_time')!), isAllDay ? 'yyyy.MM.dd' : 'yyyy.MM.dd HH:mm')
                      : t('events.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch('end_time') ? new Date(watch('end_time')!) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const current = watch('end_time') ? new Date(watch('end_time')!) : new Date();
                        date.setHours(current.getHours(), current.getMinutes());
                        setValue('end_time', date.toISOString());
                      }
                    }}
                  />
                  {!isAllDay && (
                    <div className="p-3 border-t">
                      <Input
                        type="time"
                        value={watch('end_time') ? format(new Date(watch('end_time')!), 'HH:mm') : '10:00'}
                        onChange={(e) => {
                          const date = watch('end_time') ? new Date(watch('end_time')!) : new Date();
                          const [hours, minutes] = e.target.value.split(':').map(Number);
                          date.setHours(hours, minutes);
                          setValue('end_time', date.toISOString());
                        }}
                      />
                    </div>
                  )}
                </PopoverContent>
              </Popover>
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
                value={watch('project_id') || '__none__'}
                onValueChange={(value) => setValue('project_id', value === '__none__' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('events.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('events.noProject')}</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('events.sales')}</Label>
              <Select
                value={watch('sales_id') || '__none__'}
                onValueChange={(value) => setValue('sales_id', value === '__none__' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('events.selectSales')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('events.noSales')}</SelectItem>
                  {sales?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('events.responsibleUser')}</Label>
            <Select
              value={watch('responsible_user_id') || '__none__'}
              onValueChange={(value) => setValue('responsible_user_id', value === '__none__' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('events.selectResponsible')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('events.noResponsible')}</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Participants Section */}
          <div className="space-y-3 border-t pt-4">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('events.participants')}
            </Label>

            {/* Internal User */}
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('events.selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  {users?.filter(u => !participants.some(p => p.user_id === u.id)).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addInternalParticipant}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            {/* External Email */}
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

            {/* Participant List */}
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {participants.map((p, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {p.type === 'internal' ? <UserPlus className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                    {p.name || p.email}
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="ml-1 hover:text-destructive"
                    >
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
              {event ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
