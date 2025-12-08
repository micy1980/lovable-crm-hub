import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useApprovalWorkflows, ApprovalWorkflow } from '@/hooks/useApprovalWorkflows';

interface ApprovalRequestButtonProps {
  entityType: 'contract' | 'document' | 'project';
  entityId: string;
}

export const ApprovalRequestButton = ({ entityType, entityId }: ApprovalRequestButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const { approvals, requestApproval, isRequesting } = useApprovalWorkflows(entityType, entityId);

  const latestApproval = approvals[0];

  const handleRequest = () => {
    requestApproval({
      entityType,
      entityId,
      notes: notes || undefined,
    });
    setDialogOpen(false);
    setNotes('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
            <Clock className="h-3 w-3" />
            Jóváhagyásra vár
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

  const entityLabels: Record<string, string> = {
    contract: 'szerződés',
    document: 'dokumentum',
    project: 'projekt',
  };

  return (
    <>
      {latestApproval ? (
        <div className="flex items-center gap-2">
          {getStatusBadge(latestApproval.status)}
          {latestApproval.status !== 'pending' && (
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Új kérelem
            </Button>
          )}
        </div>
      ) : (
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Send className="h-4 w-4 mr-2" />
          Jóváhagyás kérése
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jóváhagyás kérése</DialogTitle>
            <DialogDescription>
              Kérjen jóváhagyást ehhez: {entityLabels[entityType]}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Megjegyzés (opcionális)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indoklás vagy megjegyzés a jóváhagyónak..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleRequest} disabled={isRequesting}>
              <Send className="h-4 w-4 mr-2" />
              Kérelem küldése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
