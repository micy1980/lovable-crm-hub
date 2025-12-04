import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LOGO_PATH = 'app-logo.png';
const BUCKET_NAME = 'branding';

export const useAppLogo = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      // Get public URL for the logo
      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(LOGO_PATH);

      // Check if file exists by trying to fetch it
      const response = await fetch(data.publicUrl, { method: 'HEAD' });
      if (response.ok) {
        // Add cache buster to force refresh
        setLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
      } else {
        setLogoUrl(null);
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
      setLogoUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadLogo = async (file: File): Promise<boolean> => {
    try {
      // Delete existing logo first
      await supabase.storage.from(BUCKET_NAME).remove([LOGO_PATH]);

      // Upload new logo
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(LOGO_PATH, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Refresh the logo URL
      await fetchLogo();
      return true;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return false;
    }
  };

  const deleteLogo = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([LOGO_PATH]);

      if (error) throw error;

      setLogoUrl(null);
      return true;
    } catch (error) {
      console.error('Error deleting logo:', error);
      return false;
    }
  };

  return {
    logoUrl,
    isLoading,
    uploadLogo,
    deleteLogo,
    refreshLogo: fetchLogo,
  };
};
