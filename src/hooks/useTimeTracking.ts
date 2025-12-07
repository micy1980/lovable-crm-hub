import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  company_id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_running: boolean;
  created_at: string;
  task?: {
    title: string;
    project?: { name: string; code: string | null } | null;
  };
}

export const useTimeTracking = (taskId?: string) => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['time-entries', activeCompany?.id, taskId],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          task:tasks(title, project:projects(name, code))
        `)
        .eq('company_id', activeCompany.id)
        .order('start_time', { ascending: false });
      
      if (taskId) {
        query = query.eq('task_id', taskId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!activeCompany?.id,
  });

  const { data: runningEntry } = useQuery({
    queryKey: ['running-time-entry', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          task:tasks(title, project:projects(name, code))
        `)
        .eq('user_id', user.id)
        .eq('is_running', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as TimeEntry | null;
    },
    enabled: !!user?.id,
  });

  const startTimer = useMutation({
    mutationFn: async (params: { taskId: string; description?: string }) => {
      if (!user?.id || !activeCompany?.id) throw new Error('No user or company');

      // Stop any running timer first
      if (runningEntry) {
        await stopTimer.mutateAsync(runningEntry.id);
      }

      const { error } = await supabase
        .from('time_entries')
        .insert({
          task_id: params.taskId,
          user_id: user.id,
          company_id: activeCompany.id,
          description: params.description || null,
          start_time: new Date().toISOString(),
          is_running: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['running-time-entry'] });
      toast.success('Időmérő elindítva');
    },
    onError: () => {
      toast.error('Hiba az időmérő indításakor');
    },
  });

  const stopTimer = useMutation({
    mutationFn: async (entryId: string) => {
      const endTime = new Date();
      
      // Get entry to calculate duration
      const { data: entry } = await supabase
        .from('time_entries')
        .select('start_time')
        .eq('id', entryId)
        .single();

      if (!entry) throw new Error('Entry not found');

      const startTime = new Date(entry.start_time);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          is_running: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['running-time-entry'] });
      toast.success('Időmérő leállítva');
    },
    onError: () => {
      toast.error('Hiba az időmérő leállításakor');
    },
  });

  const addManualEntry = useMutation({
    mutationFn: async (params: {
      taskId: string;
      description?: string;
      startTime: Date;
      endTime: Date;
    }) => {
      if (!user?.id || !activeCompany?.id) throw new Error('No user or company');

      const durationMinutes = Math.round((params.endTime.getTime() - params.startTime.getTime()) / 60000);

      const { error } = await supabase
        .from('time_entries')
        .insert({
          task_id: params.taskId,
          user_id: user.id,
          company_id: activeCompany.id,
          description: params.description || null,
          start_time: params.startTime.toISOString(),
          end_time: params.endTime.toISOString(),
          duration_minutes: durationMinutes,
          is_running: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Időbejegyzés hozzáadva');
    },
    onError: () => {
      toast.error('Hiba az időbejegyzés hozzáadásakor');
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['running-time-entry'] });
      toast.success('Időbejegyzés törölve');
    },
    onError: () => {
      toast.error('Hiba az időbejegyzés törlésekor');
    },
  });

  // Calculate total time for all entries
  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);

  return {
    timeEntries,
    runningEntry,
    isLoading,
    startTimer: startTimer.mutate,
    stopTimer: stopTimer.mutate,
    addManualEntry: addManualEntry.mutate,
    deleteEntry: deleteEntry.mutate,
    totalMinutes,
    isStarting: startTimer.isPending,
    isStopping: stopTimer.isPending,
  };
};
