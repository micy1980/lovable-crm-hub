import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key } from 'lucide-react';

interface LicenseActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  onSuccess?: () => void;
}

export function LicenseActivationDialog({ 
  open, 
  onOpenChange, 
  companyId,
  onSuccess 
}: LicenseActivationDialogProps) {
  const { toast } = useToast();
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);

  const formatLicenseKey = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Split into groups of 5 characters
    const groups = [];
    for (let i = 0; i < cleaned.length && i < 25; i += 5) {
      groups.push(cleaned.substring(i, i + 5));
    }
    
    return groups.join('-');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value);
    setLicenseKey(formatted);
  };

  const handleActivate = async () => {
    const cleanKey = licenseKey.replace(/-/g, '');
    
    if (cleanKey.length !== 25) {
      toast({
        variant: 'destructive',
        title: 'Hiba',
        description: 'A licensz kulcsnak pontosan 25 karakterből kell állnia!',
      });
      return;
    }

    if (!companyId) {
      toast({
        variant: 'destructive',
        title: 'Hiba',
        description: 'Először mentse el a vállalatot!',
      });
      return;
    }

    setActivating(true);

    try {
      const { data, error } = await supabase.functions.invoke('activate-license', {
        body: {
          company_id: companyId,
          license_key: `ORB-${cleanKey}`,
        },
      });

      // Check if the response contains an error message in the data
      if (data && !data.success) {
        const errorMessage = data.details || data.error || 'Ismeretlen hiba történt';
        toast({
          variant: 'destructive',
          title: 'Licensz aktiválási hiba',
          description: errorMessage,
        });
        setActivating(false);
        return;
      }

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: 'Licensz aktiválva',
          description: `A licensz sikeresen aktiválva lett`,
        });
        setLicenseKey('');
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('License activation error:', error);
      toast({
        variant: 'destructive',
        title: 'Licensz aktiválási hiba',
        description: error.message || 'Nem sikerült aktiválni a licensz kulcsot',
      });
    } finally {
      setActivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Licenszkulcs aktiválása
          </DialogTitle>
          <DialogDescription>
            Adja meg a licensz kulcsot 5x5 karakteres formátumban
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="license-key">Licenszkulcs</Label>
            <Input
              id="license-key"
              value={licenseKey}
              onChange={handleInputChange}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              className="font-mono text-lg tracking-wider text-center"
              maxLength={29}
              disabled={activating}
            />
          </div>

          {!companyId && (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
              ⚠️ Először mentse el a vállalatot, mielőtt licensz kulcsot aktiválna!
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={activating}
          >
            Mégse
          </Button>
          <Button
            type="button"
            onClick={handleActivate}
            disabled={activating || !companyId || licenseKey.replace(/-/g, '').length !== 25}
          >
            {activating ? 'Aktiválás...' : 'Aktiválás'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
