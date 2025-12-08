import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, FileSignature, FileText, FolderKanban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useApprovalWorkflows } from '@/hooks/useApprovalWorkflows';
import { useNavigate } from 'react-router-dom';

export const PendingApprovalsList = () => {
  const navigate = useNavigate();
  const { pendingApprovals, approveRequest, rejectRequest, isLoading } = useApprovalWorkflows();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'contract':
        return <FileSignature className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'project':
        return <FolderKanban className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case 'contract':
        return 'Szerződés';
      case 'document':
        return 'Dokumentum';
      case 'project':
        return 'Projekt';
      default:
        return entityType;
    }
  };

  const navigateToEntity = (entityType: string, entityId: string) => {
    switch (entityType) {
      case 'contract':
        navigate(`/contracts/${entityId}`);
        break;
      case 'document':
        navigate(`/documents/${entityId}`);
        break;
      case 'project':
        navigate(`/projects/${entityId}`);
        break;
    }
  };

  const handleApprove = (approvalId: string) => {
    approveRequest(approvalId);
  };

  const handleRejectClick = (approvalId: string) => {
    setSelectedApprovalId(approvalId);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedApprovalId && rejectionReason.trim()) {
      rejectRequest({ approvalId: selectedApprovalId, reason: rejectionReason });
      setRejectDialogOpen(false);
      setSelectedApprovalId(null);
      setRejectionReason('');
    }
  };

  const formatDate = (date: string) => {
    return format(parseISO(date), 'yyyy.MM.dd HH:mm', { locale: hu });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (pendingApprovals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nincs függő jóváhagyás</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Függő jóváhagyások ({pendingApprovals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingApprovals.map((approval) => (
            <div
              key={approval.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-full">
                  {getEntityIcon(approval.entity_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getEntityLabel(approval.entity_type)}</Badge>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary"
                      onClick={() => navigateToEntity(approval.entity_type, approval.entity_id)}
                    >
                      Megtekintés
                    </Button>
                  </div>
                  {approval.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{approval.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Beküldve: {formatDate(approval.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => handleApprove(approval.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Jóváhagyás
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => handleRejectClick(approval.id)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Elutasítás
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jóváhagyás elutasítása</DialogTitle>
            <DialogDescription>
              Kérjük, adja meg az elutasítás okát.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Elutasítás oka *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Indokolja meg az elutasítást..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Mégse
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim()}
            >
              Elutasítás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
