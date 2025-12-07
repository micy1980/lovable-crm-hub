import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Plus, Loader2 } from 'lucide-react';
import { useMasterData } from '@/hooks/useMasterData';
import { DocumentTemplate, useDocumentTemplates } from '@/hooks/useDocumentTemplates';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: DocumentTemplate;
}

export const TemplateDialog = ({ open, onOpenChange, template }: TemplateDialogProps) => {
  const { items: categories } = useMasterData('template_category');
  const { createTemplate, updateTemplate } = useDocumentTemplates();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [newVariable, setNewVariable] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setCategory(template.category || '');
      setVariables(template.variables || []);
      setFile(null);
    } else {
      setName('');
      setDescription('');
      setCategory('');
      setVariables([]);
      setFile(null);
    }
  }, [template, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const addVariable = () => {
    if (newVariable && !variables.includes(newVariable)) {
      setVariables([...variables, newVariable]);
      setNewVariable('');
    }
  };

  const removeVariable = (variable: string) => {
    setVariables(variables.filter(v => v !== variable));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!template && !file)) return;

    setIsSubmitting(true);
    try {
      if (template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          name,
          description,
          category,
          variables,
        });
      } else if (file) {
        await createTemplate.mutateAsync({
          name,
          description,
          category,
          file,
          variables,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Sablon szerkesztése' : 'Új sablon létrehozása'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Sablon neve *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pl.: Ajánlat sablon"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategória</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz kategóriát" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Leírás</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sablon leírása..."
              rows={3}
            />
          </div>

          {!template && (
            <div className="space-y-2">
              <Label>Sablon fájl *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {file ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".doc,.docx,.xls,.xlsx,.pdf,.odt,.ods"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Kattints a fájl feltöltéséhez
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Változók (placeholderek)</Label>
            <p className="text-xs text-muted-foreground">
              Add meg a sablonban használt változókat, pl.: &#123;&#123;partner_nev&#125;&#125;
            </p>
            <div className="flex gap-2">
              <Input
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                placeholder="Változó neve"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addVariable();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addVariable}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {variables.map((variable) => (
                <Badge key={variable} variant="secondary" className="gap-1">
                  {`{{${variable}}}`}
                  <button
                    type="button"
                    onClick={() => removeVariable(variable)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={isSubmitting || !name || (!template && !file)}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {template ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
