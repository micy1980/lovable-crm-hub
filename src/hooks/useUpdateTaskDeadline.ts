import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const useUpdateTaskDeadline = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ taskId, newDeadline }: { taskId: string; newDeadline: Date }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deadline: newDeadline.toISOString() })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: t('calendar.taskMoved', 'Feladat áthelyezve'),
        description: t('calendar.taskMovedDescription', 'A feladat határideje frissítve.'),
      });
    },
    onError: (error) => {
      console.error('Error updating task deadline:', error);
      toast({
        title: t('common.error', 'Hiba'),
        description: t('calendar.taskMoveError', 'Nem sikerült a feladat áthelyezése.'),
        variant: 'destructive',
      });
    },
  });
};
