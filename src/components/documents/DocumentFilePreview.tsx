import { useState, useEffect, useCallback } from 'react';
import { Download, Loader2, FileText, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType?.startsWith('application/pdf') || mimeType === 'application/x-pdf';
  const canPreview = isImage || isPdf;

  const revokePreviewUrl = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  useEffect(() => {
    if (open && canPreview) {
      void loadPreview();
    } else {
      revokePreviewUrl();
      setPreviewUrl(null);
      setPdfData(null);
      setError(null);
      setPdfError(false);
      setNumPages(null);
      setPageNumber(1);
    }

    return () => {
      revokePreviewUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filePath, mimeType]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    setPdfError(false);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      if (isPdf) {
        // For PDF, convert to ArrayBuffer for react-pdf
        const arrayBuffer = await data.arrayBuffer();
        setPdfData(arrayBuffer);
      } else {
        // For images, create blob URL
        const blob = new Blob([data], {
          type: mimeType ?? 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (err: any) {
      setError('Nem sikerült betölteni az előnézetet: ' + (err?.message ?? 'ismeretlen hiba'));
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      revokePreviewUrl();
      setPreviewUrl(null);
      setPdfData(null);
      setError(null);
      setPdfError(false);
      setNumPages(null);
      setPageNumber(1);
    }
    onOpenChange(nextOpen);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF load error:', err);
    setPdfError(true);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages ?? 1));
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
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

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
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

          {/* Image preview */}
          {!loading && !error && previewUrl && isImage && (
            <img
              src={previewUrl}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain"
            />
          )}

          {/* PDF preview with react-pdf */}
          {!loading && !error && pdfData && isPdf && !pdfError && (
            <div className="flex flex-col items-center w-full h-full">
              {/* PDF navigation */}
              {numPages && numPages > 1 && (
                <div className="flex items-center gap-2 py-2 bg-background/80 backdrop-blur-sm rounded-lg px-4 mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {pageNumber} / {numPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* PDF Document */}
              <div className="overflow-auto max-h-[65vh] w-full flex justify-center">
                <Document
                  file={{ data: pdfData }}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span>PDF betöltése...</span>
                    </div>
                  }
                >
                  <Page 
                    pageNumber={pageNumber} 
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-lg"
                    width={Math.min(800, window.innerWidth - 100)}
                  />
                </Document>
              </div>
            </div>
          )}

          {/* PDF error fallback */}
          {!loading && !error && isPdf && pdfError && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground p-8">
              <FileText className="h-16 w-16" />
              <span className="text-center">
                A PDF előnézet nem sikerült, kérjük töltse le a fájlt.
              </span>
              <Button onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Letöltés
              </Button>
            </div>
          )}

          {/* Unsupported file type */}
          {!canPreview && !loading && !error && (
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
