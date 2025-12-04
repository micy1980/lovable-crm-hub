import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Trash2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppLogo } from '@/hooks/useAppLogo';
import { toast } from 'sonner';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';

export const LogoSettings = () => {
  const { t } = useTranslation();
  const { logoUrl, isLoading, uploadLogo, deleteLogo } = useAppLogo();
  const { data: profile } = useUserProfile();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuper = isSuperAdmin(profile);

  if (!isSuper) {
    return null;
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Csak képfájlok tölthetők fel');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A fájl mérete maximum 2MB lehet');
      return;
    }

    setIsUploading(true);
    const success = await uploadLogo(file);
    setIsUploading(false);

    if (success) {
      toast.success('Logo sikeresen feltöltve');
    } else {
      toast.error('Hiba a logo feltöltése során');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    const success = await deleteLogo();
    if (success) {
      toast.success('Logo törölve');
    } else {
      toast.error('Hiba a logo törlése során');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Alkalmazás Logo
        </CardTitle>
        <CardDescription>
          Töltsd fel a program logóját. A logo megjelenik a bejelentkezési oldalon és a sidebarban.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {/* Logo preview */}
          <div className="w-24 h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
            {isLoading ? (
              <div className="animate-pulse bg-muted w-full h-full" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt="App Logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <Image className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Feltöltés...' : 'Logo feltöltése'}
            </Button>
            {logoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Logo törlése
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Ajánlott méret: 200x200 pixel. Maximum fájlméret: 2MB. Támogatott formátumok: PNG, JPG, SVG.
        </p>
      </CardContent>
    </Card>
  );
};
