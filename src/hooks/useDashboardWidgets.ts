import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';

export interface WidgetPreference {
  id: string;
  widget_id: string;
  is_visible: boolean;
  position: number;
  width: 'full' | 'half' | 'third';
}

interface WidgetConfig {
  id: string;
  title: string;
  defaultVisible: boolean;
  defaultPosition: number;
  defaultWidth: 'full' | 'half' | 'third';
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'license_status', title: 'Licenc státusz', defaultVisible: true, defaultPosition: 0, defaultWidth: 'half' },
  { id: 'tasks', title: 'Feladatok', defaultVisible: true, defaultPosition: 1, defaultWidth: 'half' },
  { id: 'weekly_calendar', title: 'Heti naptár', defaultVisible: true, defaultPosition: 2, defaultWidth: 'full' },
  { id: 'projects_chart', title: 'Projektek', defaultVisible: true, defaultPosition: 3, defaultWidth: 'half' },
  { id: 'sales_chart', title: 'Értékesítés', defaultVisible: true, defaultPosition: 4, defaultWidth: 'half' },
  { id: 'recent_activity', title: 'Legutóbbi aktivitás', defaultVisible: true, defaultPosition: 5, defaultWidth: 'full' },
];

export const useDashboardWidgets = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['dashboard-widgets', user?.id, activeCompany?.id],
    queryFn: async () => {
      if (!user?.id || !activeCompany?.id) return [];

      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.id)
        .order('position');

      if (error) throw error;
      return data as WidgetPreference[];
    },
    enabled: !!user?.id && !!activeCompany?.id,
  });

  // Merge saved preferences with defaults
  const widgets = DEFAULT_WIDGETS.map((defaultWidget) => {
    const saved = preferences.find((p) => p.widget_id === defaultWidget.id);
    if (saved) {
      return {
        ...defaultWidget,
        is_visible: saved.is_visible,
        position: saved.position,
        width: saved.width as 'full' | 'half' | 'third',
      };
    }
    return {
      ...defaultWidget,
      is_visible: defaultWidget.defaultVisible,
      position: defaultWidget.defaultPosition,
      width: defaultWidget.defaultWidth,
    };
  }).sort((a, b) => a.position - b.position);

  const updateWidget = useMutation({
    mutationFn: async (params: { widgetId: string; isVisible?: boolean; position?: number; width?: string }) => {
      if (!user?.id || !activeCompany?.id) throw new Error('No user or company');

      const { data: existing } = await supabase
        .from('dashboard_widgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.id)
        .eq('widget_id', params.widgetId)
        .single();

      const updateData: any = { updated_at: new Date().toISOString() };
      if (params.isVisible !== undefined) updateData.is_visible = params.isVisible;
      if (params.position !== undefined) updateData.position = params.position;
      if (params.width !== undefined) updateData.width = params.width;

      if (existing) {
        const { error } = await supabase
          .from('dashboard_widgets')
          .update(updateData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const defaultWidget = DEFAULT_WIDGETS.find((w) => w.id === params.widgetId);
        const { error } = await supabase
          .from('dashboard_widgets')
          .insert({
            user_id: user.id,
            company_id: activeCompany.id,
            widget_id: params.widgetId,
            is_visible: params.isVisible ?? defaultWidget?.defaultVisible ?? true,
            position: params.position ?? defaultWidget?.defaultPosition ?? 0,
            width: params.width ?? defaultWidget?.defaultWidth ?? 'half',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
  });

  const reorderWidgets = useMutation({
    mutationFn: async (orderedWidgetIds: string[]) => {
      if (!user?.id || !activeCompany?.id) throw new Error('No user or company');

      // Update positions for all widgets
      for (let i = 0; i < orderedWidgetIds.length; i++) {
        await updateWidget.mutateAsync({ widgetId: orderedWidgetIds[i], position: i });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
  });

  const resetToDefaults = useMutation({
    mutationFn: async () => {
      if (!user?.id || !activeCompany?.id) throw new Error('No user or company');

      // Delete all saved preferences for this user/company
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
  });

  return {
    widgets,
    isLoading,
    updateWidget: updateWidget.mutate,
    reorderWidgets: reorderWidgets.mutate,
    resetToDefaults: resetToDefaults.mutate,
    isUpdating: updateWidget.isPending || reorderWidgets.isPending || resetToDefaults.isPending,
  };
};
