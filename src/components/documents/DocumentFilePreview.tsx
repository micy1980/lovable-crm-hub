import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Loader2, FileText, Image as ImageIcon, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure pdf.js worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentFilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  fileName: string;
  mimeType: string | null;
  onDownload: () => void;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 2; // 100%

export const DocumentFilePreview = ({
  open,
  onOpenChange,
  filePath,
  fileName,
  mimeType,
  onDownload,
}: DocumentFilePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType?.startsWith('application/pdf') || mimeType === 'application/x-pdf';
  const canPreview = isImage || isPdf;
  const zoom = ZOOM_LEVELS[zoomIndex];

  const revokeUrls = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  }, [previewUrl, pdfUrl]);

  useEffect(() => {
    if (open && canPreview) {
      void loadPreview();
    } else {
      revokeUrls();
      setPreviewUrl(null);
      setPdfUrl(null);
      setError(null);
      setPdfError(false);
      setNumPages(null);
      setIsFullscreen(false);
      setZoomIndex(DEFAULT_ZOOM_INDEX);
      setCurrentPage(1);
      pageRefs.current.clear();
    }

    return () => {
      revokeUrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filePath, mimeType]);

  // Track current page based on scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !numPages) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;
      
      let closestPage = 1;
      let closestDistance = Infinity;

      pageRefs.current.forEach((element, pageNum) => {
        const rect = element.getBoundingClientRect();
        const pageCenter = rect.top + rect.height / 2;
        const distance = Math.abs(pageCenter - containerCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = pageNum;
        }
      });

      setCurrentPage(closestPage);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [numPages]);

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
        const pdfBlob = new Blob([data], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      } else {
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
      revokeUrls();
      setPreviewUrl(null);
      setPdfUrl(null);
      setError(null);
      setPdfError(false);
      setNumPages(null);
      setIsFullscreen(false);
      setZoomIndex(DEFAULT_ZOOM_INDEX);
      setCurrentPage(1);
      pageRefs.current.clear();
    }
    onOpenChange(nextOpen);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF load error:', err);
    setPdfError(true);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const zoomIn = () => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  };

  const zoomOut = () => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
  };

  const resetZoom = () => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
  };

  // Calculate base page width
  const getBasePageWidth = () => {
    if (isFullscreen) {
      return Math.min(900, window.innerWidth - 80);
    }
    return Math.min(700, window.innerWidth - 100);
  };

  const setPageRef = (pageNum: number) => (el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el);
    } else {
      pageRefs.current.delete(pageNum);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent 
        className={`flex flex-col ${
          isFullscreen 
            ? 'max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh]' 
            : 'max-w-5xl w-[90vw] max-h-[90vh]'
        }`}
      >
        <DialogHeader className="flex flex-row items-center gap-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium truncate flex-1">
            {isImage ? <ImageIcon className="h-4 w-4 flex-shrink-0" /> : <FileText className="h-4 w-4 flex-shrink-0" />}
            <span className="truncate">{fileName}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? 'Kilépés teljes képernyőből' : 'Teljes képernyő'}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Letöltés
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-muted/30 rounded-lg overflow-hidden relative">
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
            <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
              <img
                src={previewUrl}
                alt={fileName}
                className={`object-contain ${isFullscreen ? 'max-h-[85vh]' : 'max-h-[70vh]'} max-w-full`}
              />
            </div>
          )}

          {/* PDF preview with react-pdf - continuous scroll */}
          {!loading && !error && pdfUrl && isPdf && !pdfError && (
            <>
              {/* Zoom controls - floating toolbar */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-lg border border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={zoomOut}
                  disabled={zoomIndex <= 0}
                  title="Kicsinyítés"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <button
                  onClick={resetZoom}
                  className="px-2 py-1 text-sm font-medium hover:bg-muted rounded min-w-[60px] text-center"
                  title="Eredeti méret"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={zoomIn}
                  disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
                  title="Nagyítás"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={resetZoom}
                  title="Visszaállítás"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Page indicator - floating */}
              {numPages && numPages > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-border">
                  <span className="text-sm font-medium">
                    {currentPage} / {numPages} oldal
                  </span>
                </div>
              )}

              <div 
                ref={scrollContainerRef}
                className={`overflow-auto w-full ${isFullscreen ? 'h-[85vh]' : 'h-[70vh]'} flex justify-center pt-12 pb-16`}
              >
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span>PDF betöltése...</span>
                    </div>
                  }
                >
                  <div className="flex flex-col items-center gap-4 py-4">
                    {numPages && Array.from({ length: numPages }, (_, index) => (
                      <div key={`page_${index + 1}`} ref={setPageRef(index + 1)}>
                        <Page 
                          pageNumber={index + 1} 
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="shadow-lg"
                          width={getBasePageWidth() * zoom}
                        />
                      </div>
                    ))}
                  </div>
                </Document>
              </div>
            </>
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
