import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export type FavoriteEntityType = 'partner' | 'project' | 'sales' | 'contract' | 'document';

interface Favorite {
  id: string;
  user_id: string;
  entity_type: FavoriteEntityType;
  entity_id: string;
  company_id: string;
  created_at: string;
}

export function useFavorites() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id, activeCompany?.id],
    queryFn: async () => {
      if (!user?.id || !activeCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.id);
      
      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!user?.id && !!activeCompany?.id,
  });

  const addFavorite = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: FavoriteEntityType; entityId: string }) => {
      if (!user?.id || !activeCompany?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          company_id: activeCompany.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({ title: t('favorites.added') });
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: FavoriteEntityType; entityId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({ title: t('favorites.removed') });
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const isFavorite = (entityType: FavoriteEntityType, entityId: string): boolean => {
    return favorites.some(f => f.entity_type === entityType && f.entity_id === entityId);
  };

  const toggleFavorite = (entityType: FavoriteEntityType, entityId: string) => {
    if (isFavorite(entityType, entityId)) {
      removeFavorite.mutate({ entityType, entityId });
    } else {
      addFavorite.mutate({ entityType, entityId });
    }
  };

  const getFavoritesByType = (entityType: FavoriteEntityType): string[] => {
    return favorites
      .filter(f => f.entity_type === entityType)
      .map(f => f.entity_id);
  };

  return {
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    getFavoritesByType,
  };
}
