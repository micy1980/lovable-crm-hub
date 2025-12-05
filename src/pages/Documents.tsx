import { useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText, Download, ExternalLink } from 'lucide-react';
import { DocumentDialog } from '@/components/documents/DocumentDialog';
import { toast } from 'sonner';
import { LicenseGuard } from '@/components/license/LicenseGuard';

const Documents = () => {
  const { activeCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          projects(name),
          sales(name),
          partners(name),
          profiles!documents_uploaded_by_fkey(full_name)
        `)
        .eq('owner_company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany,
  });

  const handleDownload = async (doc: any) => {
    if (!doc.file_path) {
      toast.error('Nincs elérhető fájl');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dokumentum letöltése megkezdődött');
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Hiba történt a letöltés során');
    }
  };

  const handleEdit = (doc: any) => {
    setSelectedDocument(doc);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedDocument(null);
    }
    setDialogOpen(open);
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVisibilityBadge = (visibility: string) => {
    const variants: Record<string, any> = {
      COMPANY_ONLY: { label: 'Cég', variant: 'default' },
      PROJECT_ONLY: { label: 'Projekt', variant: 'secondary' },
      SALES_ONLY: { label: 'Értékesítés', variant: 'outline' },
      PUBLIC: { label: 'Publikus', variant: 'default' },
    };

    const config = variants[visibility] || { label: visibility, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!activeCompany) {
    return (
      <LicenseGuard feature="documents">
        <div className="flex h-full items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Nincs kiválasztott cég</CardTitle>
              <CardDescription>
                Válasszon ki egy céget a folytatáshoz
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </LicenseGuard>
    );
  }

  return (
    <LicenseGuard feature="documents">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dokumentumok</h1>
          <p className="text-muted-foreground">
            Kezelje cége dokumentumait
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Új dokumentum
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keresés dokumentumok között..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Betöltés...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nincs találat' : 'Még nincsenek dokumentumok'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">{doc.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {doc.description || 'Nincs leírás'}
                    </CardDescription>
                  </div>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {getVisibilityBadge(doc.visibility)}
                  {doc.file_size && (
                    <span className="text-xs text-muted-foreground">
                      {(doc.file_size / 1024).toFixed(2)} KB
                    </span>
                  )}
                </div>

                {(doc.projects || doc.sales || doc.partners) && (
                  <div className="text-sm">
                    {doc.projects && (
                      <p className="text-muted-foreground">
                        Projekt: <span className="font-medium">{doc.projects.name}</span>
                      </p>
                    )}
                    {doc.sales && (
                      <p className="text-muted-foreground">
                        Értékesítés: <span className="font-medium">{doc.sales.name}</span>
                      </p>
                    )}
                    {doc.partners && (
                      <p className="text-muted-foreground">
                        Partner: <span className="font-medium">{doc.partners.name}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <p>Feltöltve: {new Date(doc.created_at).toLocaleDateString()}</p>
                  {doc.profiles && <p>Feltöltő: {doc.profiles.full_name}</p>}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Letöltés
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(doc)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DocumentDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        document={selectedDocument}
      />
    </div>
    </LicenseGuard>
  );
};

export default Documents;
