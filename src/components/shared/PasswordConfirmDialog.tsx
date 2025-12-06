import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export const PasswordConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: PasswordConfirmDialogProps) => {
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim()) {
      toast.error('Adja meg a jelszavát');
      return;
    }

    setVerifying(true);
    try {
      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('Nem sikerült azonosítani a felhasználót');
        return;
      }

      // Re-authenticate by signing in
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (error) {
        toast.error('Hibás jelszó');
        return;
      }

      // Password verified, proceed with action
      onConfirm();
      onOpenChange(false);
      setPassword('');
    } catch (error) {
      toast.error('Hiba történt a jelszó ellenőrzése során');
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setPassword('');
    }
    onOpenChange(open);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="password">Jelszó megerősítése</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Adja meg jelszavát"
            className="mt-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Mégse</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={verifying}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {verifying ? 'Ellenőrzés...' : 'Végleges törlés'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};