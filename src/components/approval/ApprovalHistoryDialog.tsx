import { format, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { CheckCircle, Clock, XCircle, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApprovalWorkflows } from '@/hooks/useApprovalWorkflows';

interface ApprovalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'contract' | 'document' | 'project';
  entityId: string;
}

export const ApprovalHistoryDialog = ({
  open,
  onOpenChange,
  entityType,
  entityId,
}: ApprovalHistoryDialogProps) => {
  const { approvals, isLoading } = useApprovalWorkflows(entityType, entityId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
            <Clock className="h-3 w-3" />
            Folyamatban
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Jóváhagyva
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Elutasítva
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(parseISO(date), 'yyyy.MM.dd HH:mm', { locale: hu });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Jóváhagyási előzmények
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nincs jóváhagyási előzmény
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    {getStatusBadge(approval.status)}
                    <span className="text-sm text-muted-foreground">
                      {formatDate(approval.created_at)}
                    </span>
                  </div>

                  {approval.notes && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Megjegyzés:</span> {approval.notes}
                    </p>
                  )}

                  {approval.status === 'rejected' && approval.rejection_reason && (
                    <p className="text-sm text-destructive">
                      <span className="font-medium">Elutasítás oka:</span>{' '}
                      {approval.rejection_reason}
                    </p>
                  )}

                  {approval.approved_at && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Döntés ideje:</span>{' '}
                      {formatDate(approval.approved_at)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
