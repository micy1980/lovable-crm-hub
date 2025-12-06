import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { DocumentFileUpload } from './DocumentFileUpload';

interface DocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: any;
  defaultPartnerId?: string;
  defaultProjectId?: string;
  defaultSalesId?: string;
}

interface DocumentFormData {
  title: string;
  description: string;
  visibility: string;
  project_id: string;
  sales_id: string;
  partner_id: string;
}

export const DocumentDialog = ({ open, onOpenChange, document: doc, defaultPartnerId, defaultProjectId, defaultSalesId }: DocumentDialogProps) => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const { register, handleSubmit, setValue, watch, reset } = useForm<DocumentFormData>({
    defaultValues: {
      title: '',
      description: '',
      visibility: 'COMPANY_ONLY',
      project_id: defaultProjectId || '',
      sales_id: defaultSalesId || '',
      partner_id: defaultPartnerId || '',
    }
  });

  // Reset form when dialog opens with document data
  useEffect(() => {
    if (open) {
      if (doc) {
        reset({
          title: doc.title || '',
          description: doc.description || '',
          visibility: doc.visibility || 'COMPANY_ONLY',
          project_id: doc.project_id || '',
          sales_id: doc.sales_id || '',
          partner_id: doc.partner_id || '',
        });
      } else {
        reset({
          title: '',
          description: '',
          visibility: 'COMPANY_ONLY',
          project_id: defaultProjectId || '',
          sales_id: defaultSalesId || '',
          partner_id: defaultPartnerId || '',
        });
      }
      setSelectedFiles([]);
    }
  }, [open, doc, defaultProjectId, defaultSalesId, defaultPartnerId, reset]);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany && open,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      
      const { data, error } = await supabase
        .from('sales')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany && open,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      
      const { data, error } = await supabase
        .from('partners')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany && open,
  });

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: DocumentFormData) => {
    if (!activeCompany) return;
    if (!doc && selectedFiles.length === 0) {
      toast.error('Válasszon ki legalább egy fájlt');
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const documentData = {
        title: data.title,
        description: data.description,
        visibility: data.visibility,
        owner_company_id: activeCompany.id,
        project_id: data.project_id || null,
        sales_id: data.sales_id || null,
        partner_id: data.partner_id || null,
      };

      let documentId = doc?.id;

      if (doc) {
        // Update existing document
        const { error } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', doc.id);

        if (error) throw error;
      } else {
        // Create new document
        const { data: newDoc, error } = await supabase
          .from('documents')
          .insert([documentData])
          .select()
          .single();

        if (error) throw error;
        documentId = newDoc.id;
      }

      // Upload files for new documents
      if (!doc && selectedFiles.length > 0 && documentId) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${activeCompany.id}/${documentId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { error: insertError } = await supabase
            .from('document_files')
            .insert({
              document_id: documentId,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user?.id,
            });

          if (insertError) throw insertError;
        }
      }

      toast.success(doc ? 'Dokumentum sikeresen frissítve' : 'Dokumentum sikeresen létrehozva');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-files', documentId] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving document:', error);
      toast.error('Hiba történt: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc ? 'Dokumentum szerkesztése' : 'Új dokumentum'}</DialogTitle>
          <DialogDescription>
            {doc ? 'Módosítsa a dokumentum adatait.' : 'Hozzon létre egy új dokumentumot és töltsön fel fájlokat.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Cím *</Label>
            <Input
              id="title"
              {...register('title', { required: true })}
              placeholder="Dokumentum címe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Leírás</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Dokumentum leírása"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Láthatóság</Label>
            <Select
              value={watch('visibility') || 'COMPANY_ONLY'}
              onValueChange={(value) => setValue('visibility', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPANY_ONLY">Csak cég</SelectItem>
                <SelectItem value="PROJECT_ONLY">Csak projekt</SelectItem>
                <SelectItem value="SALES_ONLY">Csak értékesítés</SelectItem>
                <SelectItem value="PUBLIC">Publikus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Projekt</Label>
              <Select
                value={watch('project_id') || 'none'}
                onValueChange={(value) => setValue('project_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nincs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nincs</SelectItem>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_id">Értékesítés</Label>
              <Select
                value={watch('sales_id') || 'none'}
                onValueChange={(value) => setValue('sales_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nincs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nincs</SelectItem>
                  {sales.map((sale: any) => (
                    <SelectItem key={sale.id} value={sale.id}>
                      {sale.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner_id">Partner</Label>
              <Select
                value={watch('partner_id') || 'none'}
                onValueChange={(value) => setValue('partner_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nincs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nincs</SelectItem>
                  {partners.map((partner: any) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!doc && (
            <DocumentFileUpload
              onFilesSelected={handleFilesSelected}
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Mentés...' : 'Mentés'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
