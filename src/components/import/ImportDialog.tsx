import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  parseImportFile,
  validateImportData,
  generateImportTemplate,
  ImportConfig,
  ImportResult,
} from '@/lib/importUtils';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  config: ImportConfig;
  templateFilename: string;
  onImport: (data: any[]) => Promise<void>;
}

export const ImportDialog = ({
  open,
  onOpenChange,
  title,
  config,
  templateFilename,
  onImport,
}: ImportDialogProps) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [rawData, setRawData] = useState<any[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await parseImportFile(file);
      if (data.length === 0) {
        toast.error('A fájl üres');
        return;
      }
      
      setRawData(data);
      
      // Auto-map columns based on header names
      const headers = data[0] as string[];
      const autoMapping: Record<string, number> = {};
      
      config.columns.forEach(col => {
        const headerIndex = headers.findIndex(h => 
          String(h).toLowerCase().trim() === col.header.toLowerCase().trim()
        );
        autoMapping[col.key] = headerIndex;
      });
      
      setColumnMapping(autoMapping);
      setStep('mapping');
    } catch (error) {
      toast.error('Hiba a fájl feldolgozása során');
    }
  };
  
  const handleValidate = () => {
    const result = validateImportData(rawData, config, columnMapping);
    setValidationResult(result);
    setStep('preview');
  };
  
  const handleImport = async () => {
    if (!validationResult || validationResult.data.length === 0) return;
    
    setIsImporting(true);
    setStep('importing');
    
    try {
      await onImport(validationResult.data);
      toast.success(`${validationResult.data.length} rekord sikeresen importálva`);
      handleClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Hiba az importálás során');
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleClose = () => {
    setStep('upload');
    setRawData([]);
    setColumnMapping({});
    setValidationResult(null);
    onOpenChange(false);
  };
  
  const handleDownloadTemplate = () => {
    generateImportTemplate(config, templateFilename);
    toast.success('Sablon letöltve');
  };
  
  const fileHeaders = rawData[0] || [];
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Tölts fel egy CSV vagy Excel fájlt az importáláshoz'}
            {step === 'mapping' && 'Rendeld hozzá az oszlopokat a megfelelő mezőkhöz'}
            {step === 'preview' && 'Ellenőrizd az adatokat importálás előtt'}
            {step === 'importing' && 'Importálás folyamatban...'}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-primary hover:underline">Fájl kiválasztása</span>
                <span className="text-muted-foreground"> vagy húzd ide</span>
              </Label>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">CSV, XLS, XLSX (max 5MB)</p>
            </div>
            
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Sablon letöltése
              </Button>
            </div>
          </div>
        )}
        
        {step === 'mapping' && (
          <div className="space-y-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {config.columns.map(col => (
                  <div key={col.key} className="flex items-center gap-4">
                    <div className="w-1/3">
                      <span className="font-medium">{col.header}</span>
                      {col.required && <span className="text-destructive ml-1">*</span>}
                    </div>
                    <Select
                      value={columnMapping[col.key]?.toString() ?? '-1'}
                      onValueChange={(value) => setColumnMapping(prev => ({
                        ...prev,
                        [col.key]: parseInt(value),
                      }))}
                    >
                      <SelectTrigger className="w-2/3">
                        <SelectValue placeholder="Válassz oszlopot..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">-- Nincs hozzárendelve --</SelectItem>
                        {fileHeaders.map((header, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {String(header) || `Oszlop ${index + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Vissza
              </Button>
              <Button onClick={handleValidate}>
                Ellenőrzés
              </Button>
            </div>
          </div>
        )}
        
        {step === 'preview' && validationResult && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Érvényes: {validationResult.data.length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>Hibás: {validationResult.errors.length}</span>
              </div>
            </div>
            
            {validationResult.errors.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-3">
                <h4 className="font-medium text-destructive mb-2">Hibák</h4>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-1 text-sm">
                    {validationResult.errors.slice(0, 50).map((error, index) => (
                      <div key={index} className="flex gap-2">
                        <Badge variant="outline" className="shrink-0">Sor {error.row}</Badge>
                        <span className="text-muted-foreground">{error.column}:</span>
                        <span>{error.message}</span>
                      </div>
                    ))}
                    {validationResult.errors.length > 50 && (
                      <div className="text-muted-foreground italic">
                        ...és még {validationResult.errors.length - 50} hiba
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {validationResult.data.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="font-medium mb-2">Importálandó adatok előnézete</h4>
                <ScrollArea className="h-[150px]">
                  <div className="text-sm space-y-1">
                    {validationResult.data.slice(0, 10).map((row, index) => (
                      <div key={index} className="truncate">
                        {index + 1}. {config.columns.filter(c => c.required).map(c => row[c.key]).join(' - ')}
                      </div>
                    ))}
                    {validationResult.data.length > 10 && (
                      <div className="text-muted-foreground italic">
                        ...és még {validationResult.data.length - 10} rekord
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Vissza
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={validationResult.data.length === 0}
              >
                Importálás ({validationResult.data.length} rekord)
              </Button>
            </div>
          </div>
        )}
        
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Importálás folyamatban...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
