import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  company_id: string;
  project_id: string | null;
  sales_id: string | null;
  created_by: string;
  responsible_user_id: string | null;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string | null;
  external_email: string | null;
  external_name: string | null;
  status: 'invited' | 'accepted' | 'declined' | 'tentative';
  notified_at: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface EventFormData {
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  project_id?: string | null;
  sales_id?: string | null;
  responsible_user_id?: string | null;
  is_all_day?: boolean;
  participants?: Array<{
    user_id?: string;
    external_email?: string;
    external_name?: string;
  }>;
}

export const useEvents = (dateRange?: { start: Date; end: Date }) => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const eventsQuery = useQuery({
    queryKey: ['events', activeCompany?.id, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      let query = supabase
        .from('events')
        .select(`
          *,
          project:projects(id, name),
          sales:sales(id, name),
          responsible_user:profiles!events_responsible_user_id_fkey(id, full_name, email),
          created_by_user:profiles!events_created_by_fkey(id, full_name, email)
        `)
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('start_time', { ascending: true });

      if (dateRange) {
        query = query
          .gte('start_time', dateRange.start.toISOString())
          .lte('start_time', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id,
  });

  const createEvent = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!activeCompany?.id) throw new Error('No active company');
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: event, error } = await supabase
        .from('events')
        .insert({
          title: data.title,
          description: data.description || null,
          start_time: data.start_time,
          end_time: data.end_time || null,
          location: data.location || null,
          company_id: activeCompany.id,
          project_id: data.project_id || null,
          sales_id: data.sales_id || null,
          created_by: userData.user.id,
          responsible_user_id: data.responsible_user_id || null,
          is_all_day: data.is_all_day || false,
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants if provided
      if (data.participants && data.participants.length > 0) {
        const participants = data.participants.map(p => ({
          event_id: event.id,
          user_id: p.user_id || null,
          external_email: p.external_email || null,
          external_name: p.external_name || null,
        }));

        const { error: participantError } = await supabase
          .from('event_participants')
          .insert(participants);

        if (participantError) throw participantError;

        // Send invitations via edge function
        await supabase.functions.invoke('send-event-invitation', {
          body: { eventId: event.id },
        });
      }

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      toast({ title: t('common.success'), description: t('events.created') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventFormData> }) => {
      const { data: event, error } = await supabase
        .from('events')
        .update({
          title: data.title,
          description: data.description,
          start_time: data.start_time,
          end_time: data.end_time,
          location: data.location,
          project_id: data.project_id,
          sales_id: data.sales_id,
          responsible_user_id: data.responsible_user_id,
          is_all_day: data.is_all_day,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      toast({ title: t('common.success'), description: t('events.updated') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      toast({ title: t('common.success'), description: t('events.deleted') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: eventsQuery.refetch,
  };
};

export const useEventParticipants = (eventId: string | null) => {
  return useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          user:profiles(id, full_name, email)
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
};

export const useMyItems = () => {
  const { activeCompany } = useCompany();

  return useQuery({
    queryKey: ['my-items', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return { tasks: [], events: [] };
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { tasks: [], events: [] };

      // Fetch tasks where user is responsible
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name),
          sales:sales(id, name)
        `)
        .eq('company_id', activeCompany.id)
        .eq('responsible_user_id', userData.user.id)
        .is('deleted_at', null)
        .order('deadline', { ascending: true });

      if (tasksError) throw tasksError;

      // Fetch events where user is responsible or created by
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          project:projects(id, name),
          sales:sales(id, name)
        `)
        .eq('company_id', activeCompany.id)
        .or(`responsible_user_id.eq.${userData.user.id},created_by.eq.${userData.user.id}`)
        .is('deleted_at', null)
        .order('start_time', { ascending: true });

      if (eventsError) throw eventsError;

      return { tasks: tasks || [], events: events || [] };
    },
    enabled: !!activeCompany?.id,
  });
};
