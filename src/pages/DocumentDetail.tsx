// Document Detail Page
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  FileText, 
  AlertTriangle,
  Eye,
  Building,
  FolderKanban,
  TrendingUp,
  Users
} from 'lucide-react';
import { TagSelector } from '@/components/shared/TagSelector';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentDialog } from '@/components/documents/DocumentDialog';
import { DocumentFilesTable } from '@/components/documents/DocumentFilesTable';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin, isAdminOrAbove } from '@/lib/roleUtils';
import { PasswordConfirmDialog } from '@/components/shared/PasswordConfirmDialog';

const DocumentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteDocument, hardDeleteDocument } = useDocuments();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);
  const { data: profile } = useUserProfile();
  const isSuper = isSuperAdmin(profile);
  const isAdmin = isAdminOrAbove(profile);

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          partner:partners(id, name),
          project:projects(id, name),
          sales:sales(id, name),
          uploader:profiles!documents_uploaded_by_fkey(id, full_name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleDelete = async () => {
    if (!id) return;
    await deleteDocument.mutateAsync(id);
    navigate('/documents');
  };

  const handleHardDelete = async () => {
    if (!id) return;
    await hardDeleteDocument.mutateAsync({
      id,
      filePath: document?.file_path,
    });
    navigate('/documents');
  };

  const isDeleted = !!document?.deleted_at;

  const getVisibilityBadge = (visibility: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      COMPANY_ONLY: { label: 'Csak cég', variant: 'default' },
      PROJECT_ONLY: { label: 'Csak projekt', variant: 'secondary' },
      SALES_ONLY: { label: 'Csak értékesítés', variant: 'outline' },
      PUBLIC: { label: 'Publikus', variant: 'default' },
    };
    const config = variants[visibility] || { label: visibility, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(parseISO(date), 'yyyy.MM.dd HH:mm', { locale: hu });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!document) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Dokumentum nem található</p>
          <Button variant="outline" onClick={() => navigate('/documents')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Vissza
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <LicenseGuard feature="documents">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/documents')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <h1 className="text-3xl font-bold">{document.title}</h1>
                {isDeleted && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Törölt
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {document.description && (
                  <span className="text-muted-foreground">{document.description}</span>
                )}
                <TagSelector entityType="document" entityId={document.id} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Szerkesztés
            </Button>
            {isAdmin && !isDeleted && (
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Törlés
              </Button>
            )}
            {isSuper && isDeleted && (
              <Button variant="destructive" onClick={() => setHardDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Végleges törlés
              </Button>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4 flex-wrap">
          {getVisibilityBadge(document.visibility)}
        </div>

        {/* Files Table */}
        <DocumentFilesTable documentId={id!} documentTitle={document?.title || 'dokumentum'} isDeleted={isDeleted} />

        {/* Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Láthatóság és metaadatok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Láthatóság</span>
                {getVisibilityBadge(document.visibility)}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Létrehozva</span>
                <span>{formatDate(document.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Módosítva</span>
                <span>{formatDate(document.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Relations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Kapcsolódó entitások
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Partner
                </span>
                {document.partner ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate(`/partners/${document.partner.id}`)}
                  >
                    {document.partner.name}
                  </Button>
                ) : (
                  <span>-</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Projekt
                </span>
                {document.project ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate(`/projects/${document.project.id}`)}
                  >
                    {document.project.name}
                  </Button>
                ) : (
                  <span>-</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Értékesítés
                </span>
                {document.sales ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate(`/sales/${document.sales.id}`)}
                  >
                    {document.sales.name}
                  </Button>
                ) : (
                  <span>-</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DocumentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        document={document}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokumentum törlése</AlertDialogTitle>
            <AlertDialogDescription>
              A dokumentum törlésre kerül jelölve. Super Admin később véglegesen törölheti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Törlés</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordConfirmDialog
        open={hardDeleteOpen}
        onOpenChange={setHardDeleteOpen}
        onConfirm={handleHardDelete}
        title="Dokumentum végleges törlése"
        description="A dokumentum és a hozzá tartozó fájlok véglegesen törlésre kerülnek. Ez a művelet nem visszavonható. Kérjük, adja meg jelszavát a megerősítéshez."
      />
    </LicenseGuard>
  );
};

export default DocumentDetail;
