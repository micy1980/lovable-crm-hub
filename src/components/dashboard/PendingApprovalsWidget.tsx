import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, FileSignature, FileText, FolderKanban, ExternalLink } from 'lucide-react';
import { useApprovalWorkflows } from '@/hooks/useApprovalWorkflows';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';

export const PendingApprovalsWidget = () => {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const { pendingApprovals, approveRequest, rejectRequest, isLoading } = useApprovalWorkflows();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'contract': return <FileSignature className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'project': return <FolderKanban className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'contract': return 'Szerződés';
      case 'document': return 'Dokumentum';
      case 'project': return 'Projekt';
      default: return type;
    }
  };

  const navigateToEntity = (type: string, id: string) => {
    switch (type) {
      case 'contract': navigate(`/contracts/${id}`); break;
      case 'document': navigate(`/documents/${id}`); break;
      case 'project': navigate(`/projects/${id}`); break;
    }
  };

  const handleRejectClick = (approvalId: string) => {
    setSelectedApprovalId(approvalId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedApprovalId && rejectReason.trim()) {
      rejectRequest({ approvalId: selectedApprovalId, reason: rejectReason });
      setRejectDialogOpen(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Függő jóváhagyások</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingApprovals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Függő jóváhagyások</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nincs függő jóváhagyás
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Függő jóváhagyások</CardTitle>
            <Badge variant="secondary">{pendingApprovals.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {pendingApprovals.slice(0, 5).map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getEntityIcon(approval.entity_type)}
                    <div className="truncate">
                      <span className="text-sm font-medium">{getEntityLabel(approval.entity_type)}</span>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(new Date(approval.created_at), 'MM.dd HH:mm', { locale: hu })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => navigateToEntity(approval.entity_type, approval.entity_id)}
                      title="Megtekintés"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={() => approveRequest(approval.id)}
                      title="Jóváhagyás"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                      onClick={() => handleRejectClick(approval.id)}
                      title="Elutasítás"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elutasítás indoklása</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Add meg az elutasítás okát..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Mégse
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim()}
            >
              Elutasítás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};