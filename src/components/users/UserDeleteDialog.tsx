import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

interface UserDeleteDialogProps {
  user: any;
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  isDeleting: boolean;
}

export function UserDeleteDialog({
  user,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: UserDeleteDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleClose = () => {
    if (!isDeleting) {
      setPassword('');
      setPasswordError('');
      setPasswordTouched(false);
      setShowPassword(false);
      onClose();
    }
  };

  const handleDelete = async () => {
    setPasswordTouched(true);

    if (!password.trim()) {
      setPasswordError(t('users.passwordRequired'));
      return;
    }

    try {
      await onConfirm(password);
      handleClose();
    } catch (error: any) {
      if (error?.errorCode === 'INVALID_PASSWORD') {
        setPasswordError(t('users.deleteDialog.invalidPassword'));
      } else if (error?.errorCode === 'USER_HAS_ACTIVITY') {
        // This error is shown as a toast by the parent, so just close
        handleClose();
      } else {
        // Unexpected errors are handled by parent
        handleClose();
      }
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordTouched && value.trim()) {
      setPasswordError('');
    }
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('users.deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('users.deleteDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('users.fullName')}</Label>
            <div className="text-sm text-muted-foreground">{user.full_name}</div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('users.email')}</Label>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-password">{t('users.deleteDialog.yourPassword')}</Label>
            <div className="relative">
              <Input
                id="delete-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                className={passwordError ? 'border-destructive' : ''}
                disabled={isDeleting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isDeleting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? t('common.deleting') : t('users.deleteDialog.deleteButton')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
