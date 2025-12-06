import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Upload } from 'lucide-react';
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
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <span className="text-sm text-red-500">Kötelező mező</span>}
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
            <Label htmlFor="file">Fájl *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {file ? (
                <div className="space-y-2">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFile(null)}>
                    Másik fájl
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Kattintson a feltöltéshez
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
