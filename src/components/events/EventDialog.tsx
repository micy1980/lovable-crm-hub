import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: any;
  defaultDate?: Date;
  defaultTime?: string;
}

export const EventDialog = ({
  open,
  onOpenChange,
  event,
}: EventDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {event ? t('events.edit') : t('events.create')}
          </DialogTitle>
        </DialogHeader>
        <p>Event dialog content placeholder</p>
      </DialogContent>
    </Dialog>
  );
};