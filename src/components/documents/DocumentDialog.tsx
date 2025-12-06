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
import { useState } from 'react';
import { Upload } from 'lucide-react';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { register, handleSubmit, setValue, watch, reset } = useForm<DocumentFormData>({
    defaultValues: doc || {
      title: '',
      description: '',
      visibility: 'COMPANY_ONLY',
      project_id: defaultProjectId || '',
      sales_id: defaultSalesId || '',
      partner_id: defaultPartnerId || '',
    }
  });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onSubmit = async (data: DocumentFormData) => {
    if (!activeCompany) return;
    if (!doc && !selectedFile) {
      toast.error('Válasszon ki egy fájlt');
      return;
    }

    try {
      setUploading(true);
      
      let filePath = doc?.file_path;
      let fileSize = doc?.file_size;
      let mimeType = doc?.mime_type;

      // Upload file if new document or file changed
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        filePath = `${activeCompany.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        fileSize = selectedFile.size;
        mimeType = selectedFile.type;
      }

      const documentData = {
        ...data,
        owner_company_id: activeCompany.id,
        project_id: data.project_id || null,
        sales_id: data.sales_id || null,
        partner_id: data.partner_id || null,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
      };

      if (doc) {
        const { error } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', doc.id);

        if (error) throw error;
        toast.success('Dokumentum sikeresen frissítve');
      } else {
        const { error } = await supabase
          .from('documents')
          .insert([documentData]);

        if (error) throw error;
        toast.success('Dokumentum sikeresen feltöltve');
      }

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onOpenChange(false);
      reset();
      setSelectedFile(null);
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
          <DialogTitle>{doc ? 'Dokumentum szerkesztése' : 'Új dokumentum feltöltése'}</DialogTitle>
          <DialogDescription>
            Töltsön fel egy dokumentumot és adja meg a részleteit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!doc && (
            <div className="space-y-2">
              <Label htmlFor="file">Fájl *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Kiválasztva: {selectedFile.name}
                </p>
              )}
            </div>
          )}

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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Feltöltés...' : doc ? 'Mentés' : 'Feltöltés'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
