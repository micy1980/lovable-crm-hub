import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export type EntityType = 'partner' | 'project' | 'contract' | 'task' | 'sales' | 'event' | 'document';

export interface Comment {
  id: string;
  company_id: string;
  entity_type: EntityType;
  entity_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export const useComments = (entityType: EntityType, entityId: string) => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['comments', entityType, entityId];

  // Fetch comments
  const { data: comments = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!entityId) return [];

      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles!comments_user_id_fkey(id, full_name, email)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!entityId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!entityId) return;

    const channel = supabase
      .channel(`comments-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityId, entityType, queryClient, queryKey]);

  // Add comment
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!activeCompany || !user) throw new Error('No active company or user');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          company_id: activeCompany.id,
          entity_type: entityType,
          entity_id: entityId,
          user_id: user.id,
          content,
        })
        .select(`
          *,
          user:profiles!comments_user_id_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return data as Comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült hozzáadni a megjegyzést',
        variant: 'destructive',
      });
      console.error('Add comment error:', error);
    },
  });

  // Update comment
  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data, error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', id)
        .select(`
          *,
          user:profiles!comments_user_id_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return data as Comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült módosítani a megjegyzést',
        variant: 'destructive',
      });
      console.error('Update comment error:', error);
    },
  });

  // Delete comment
  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült törölni a megjegyzést',
        variant: 'destructive',
      });
      console.error('Delete comment error:', error);
    },
  });

  return {
    comments,
    isLoading,
    error,
    addComment: addComment.mutate,
    updateComment: updateComment.mutate,
    deleteComment: deleteComment.mutate,
    isAdding: addComment.isPending,
    isUpdating: updateComment.isPending,
    isDeleting: deleteComment.isPending,
  };
};
