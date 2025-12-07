import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export type TagEntityType = 'partner' | 'project' | 'sales' | 'contract' | 'document' | 'task' | 'event';

export interface Tag {
  id: string;
  name: string;
  color: string;
  company_id: string;
  created_at: string;
  created_by: string | null;
}

export interface EntityTag {
  id: string;
  tag_id: string;
  entity_type: TagEntityType;
  entity_id: string;
  created_at: string;
  tag?: Tag;
}

export function useTags() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  // Fetch all tags for the company
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('name');
      
      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!activeCompany?.id,
  });

  // Create a new tag
  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!activeCompany?.id || !user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name,
          color: color || 'blue',
          company_id: activeCompany.id,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: t('tags.created') });
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  // Update a tag
  const updateTag = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      const updates: Partial<Tag> = {};
      if (name) updates.name = name;
      if (color) updates.color = color;
      
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['entity-tags'] });
      toast({ title: t('tags.updated') });
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  // Delete a tag
  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['entity-tags'] });
      toast({ title: t('tags.deleted') });
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  return {
    tags,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
  };
}

export function useEntityTags(entityType: TagEntityType, entityId: string | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch tags for a specific entity
  const { data: entityTags = [], isLoading } = useQuery({
    queryKey: ['entity-tags', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from('entity_tags')
        .select('*, tag:tags(*)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      
      if (error) throw error;
      return data as EntityTag[];
    },
    enabled: !!entityId,
  });

  // Add tag to entity
  const addTag = useMutation({
    mutationFn: async (tagId: string) => {
      if (!entityId) throw new Error('Entity ID required');
      
      const { data, error } = await supabase
        .from('entity_tags')
        .insert({
          tag_id: tagId,
          entity_type: entityType,
          entity_id: entityId,
        })
        .select('*, tag:tags(*)')
        .single();
      
      if (error) throw error;
      return data as EntityTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-tags', entityType, entityId] });
    },
    onError: (error: any) => {
      if (!error.message?.includes('duplicate')) {
        toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      }
    },
  });

  // Remove tag from entity
  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      if (!entityId) throw new Error('Entity ID required');
      
      const { error } = await supabase
        .from('entity_tags')
        .delete()
        .eq('tag_id', tagId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-tags', entityType, entityId] });
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const hasTag = (tagId: string): boolean => {
    return entityTags.some(et => et.tag_id === tagId);
  };

  const toggleTag = (tagId: string) => {
    if (hasTag(tagId)) {
      removeTag.mutate(tagId);
    } else {
      addTag.mutate(tagId);
    }
  };

  return {
    entityTags,
    isLoading,
    addTag,
    removeTag,
    hasTag,
    toggleTag,
  };
}
