import { useState, useEffect, useRef } from 'react';
import { Download, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface DocumentFilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  fileName: string;
  mimeType: string | null;
  onDownload: () => void;
}

export const DocumentFilePreview = ({
  open,
  onOpenChange,
  filePath,
  fileName,
  mimeType,
  onDownload,
}: DocumentFilePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentBlobUrl = useRef<string | null>(null);

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const canPreview = isImage || isPdf;

  // Cleanup function to revoke blob URL
  const cleanupBlobUrl = () => {
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = null;
    }
  };

  useEffect(() => {
    if (open && canPreview) {
      loadPreview();
    }
    
    return () => {
      cleanupBlobUrl();
    };
  }, [open, filePath, mimeType]);

  const loadPreview = async () => {
    // Clean up previous blob URL before loading new one
    cleanupBlobUrl();
    setPreviewUrl(null);
    setLoading(true);
    setError(null);
    
    try {
      // Use download + blob URL for both images and PDFs
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      const url = URL.createObjectURL(data);
      currentBlobUrl.current = url;
      setPreviewUrl(url);
    } catch (err: any) {
      setError('Nem sikerült betölteni az előnézetet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    cleanupBlobUrl();
    setPreviewUrl(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium truncate pr-4">
            {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {fileName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Letöltés
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Betöltés...</span>
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center gap-2 text-destructive p-4 text-center">
              <FileText className="h-12 w-12" />
              <span>{error}</span>
            </div>
          )}
          
          {!loading && !error && previewUrl && isImage && (
            <img
              src={previewUrl}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain"
            />
          )}
          
          {!loading && !error && previewUrl && isPdf && (
            <object
              data={previewUrl}
              type="application/pdf"
              className="w-full h-[70vh] border-0"
              style={{ minHeight: '500px' }}
            >
              <div className="flex flex-col items-center gap-4 text-muted-foreground p-8">
                <FileText className="h-16 w-16" />
                <span>A PDF előnézet nem elérhető a böngészőben</span>
                <Button onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Letöltés
                </Button>
              </div>
            </object>
          )}
          
          {!canPreview && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground p-8">
              <FileText className="h-16 w-16" />
              <span>Az előnézet nem elérhető ehhez a fájltípushoz</span>
              <Button onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Letöltés
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
