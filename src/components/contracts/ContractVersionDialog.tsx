import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, FileText } from 'lucide-react';
import { useContractVersions } from '@/hooks/useContracts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ContractVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
}

interface VersionFormData {
  title: string;
  description: string;
  change_summary: string;
}

const ContractVersionDialog = ({ open, onOpenChange, contractId }: ContractVersionDialogProps) => {
  const { addVersion } = useContractVersions(contractId);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VersionFormData>({
    defaultValues: {
      title: '',
      description: '',
      change_summary: '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      setFile(droppedFiles[0]);
    }
  }, []);

  const onSubmit = async (data: VersionFormData) => {
    if (!file) return;

    await addVersion.mutateAsync({
      contractId,
      file,
      metadata: {
        title: data.title,
        description: data.description || undefined,
        change_summary: data.change_summary || undefined,
      },
    });

    reset();
    setFile(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új verzió feltöltése</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Verzió neve *</Label>
            <Input
              id="title"
              {...register('title', { required: true })}
              placeholder="pl. Aláírt szerződés"
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <span className="text-sm text-destructive">Kötelező mező</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="change_summary">Változás leírása</Label>
            <Input
              id="change_summary"
              {...register('change_summary')}
              placeholder="pl. Módosított feltételek"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Megjegyzés</Label>
            <Textarea
              id="description"
              {...register('description')}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Fájl *</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : file 
                    ? 'border-green-500 bg-green-500/5' 
                    : 'border-border hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-green-500" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFile(null)}>
                    Másik fájl
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-sm text-muted-foreground">
                    Húzza ide a fájlt vagy kattintson a feltöltéshez
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Mégse
            </Button>
            <Button type="submit" disabled={!file || addVersion.isPending}>
              Feltöltés
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractVersionDialog;
