import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/shared/ColorPicker';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export const PersonalColorSettings = () => {
  const { data: profile, isLoading } = useUserProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [taskColor, setTaskColor] = useState<string | null>(null);
  const [eventColor, setEventColor] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setTaskColor(profile.personal_task_color || null);
      setEventColor(profile.personal_event_color || null);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user?.id) {
      console.error('No user ID for saving personal colors');
      return;
    }
    
    console.log('Saving personal colors:', { taskColor, eventColor, userId: user.id });
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          personal_task_color: taskColor,
          personal_event_color: eventColor,
        })
        .eq('id', user.id)
        .select();

      console.log('Update result:', { data, error });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      toast.success('Személyes színek mentve');
    } catch (error: any) {
      console.error('Error saving personal colors:', error);
      toast.error('Hiba történt: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Betöltés...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Személyes színek</CardTitle>
        <CardDescription>
          Állítsa be a személyes feladatok és események színét a naptárban (projekthez nem tartozó elemek).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColorPicker
              value={taskColor}
              onChange={setTaskColor}
              label="Személyes feladatok színe"
            />
            <ColorPicker
              value={eventColor}
              onChange={setEventColor}
              label="Személyes események színe"
            />
          </div>
          
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Mentés...' : 'Mentés'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
