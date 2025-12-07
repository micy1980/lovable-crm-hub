import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Loader2, FileText, Image as ImageIcon, Maximize2, Minimize2, ZoomIn, ZoomOut, Search, ChevronUp, ChevronDown, X, Printer, PanelLeftClose, PanelLeft, BookOpen, Grid3X3, RotateCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Document, Page, pdfjs, Outline } from 'react-pdf';

interface OutlineItem {
  title: string;
  dest: string | any[] | null;
  items?: OutlineItem[];
}

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
  const [pageInput, setPageInput] = useState('1');
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<{ pageNum: number; index: number }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'thumbnails' | 'bookmarks'>('thumbnails');
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [outline, setOutline] = useState<OutlineItem[] | null>(null);
  const [rotation, setRotation] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      setSearchText('');
      setShowSearch(false);
      setSearchResults([]);
      setCurrentSearchIndex(0);
      setShowSidebar(false);
      setOutline(null);
      setPdfDocument(null);
      setRotation(0);
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
      setPageInput(String(closestPage));
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [numPages]);

  // Focus search input when search is opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Handle Ctrl+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && isPdf && pdfUrl && !pdfError) {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchText('');
        clearHighlights();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, isPdf, pdfUrl, pdfError, showSearch]);

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
      setSearchText('');
      setShowSearch(false);
      setSearchResults([]);
      setCurrentSearchIndex(0);
      pageRefs.current.clear();
    }
    onOpenChange(nextOpen);
  };

  const onDocumentLoadSuccess = async (pdf: any) => {
    setNumPages(pdf.numPages);
    setPdfDocument(pdf);
    
    // Try to load outline/bookmarks
    try {
      const outlineData = await pdf.getOutline();
      setOutline(outlineData);
    } catch (e) {
      setOutline(null);
    }
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

  const rotatePages = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handlePrint = async () => {
    if (!pdfDocument || !numPages) return;
    
    try {
      // Render all pages to canvas and create images
      const images: string[] = [];
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const scale = 2; // Higher scale for better print quality
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        images.push(canvas.toDataURL('image/png'));
      }
      
      // Create print content
      const printContent = images.map((img, idx) => 
        `<img src="${img}" style="width: 100%; page-break-after: ${idx < images.length - 1 ? 'always' : 'auto'}; display: block;" />`
      ).join('');
      
      // Create hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                @media print {
                  body { margin: 0; padding: 0; }
                  img { max-width: 100%; height: auto; }
                  @page { margin: 0; }
                }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        iframeDoc.close();
        
        // Wait for images to load then print
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      }
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  const goToPage = (page: number) => {
    if (!numPages || isNaN(page)) {
      setPageInput(String(currentPage));
      return;
    }
    const targetPage = Math.max(1, Math.min(page, numPages));
    setPageInput(String(targetPage));
    
    const pageEl = pageRefs.current.get(targetPage);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOutlineItemClick = async (item: OutlineItem) => {
    if (!pdfDocument || !item.dest) return;
    
    try {
      let destArray = item.dest;
      if (typeof item.dest === 'string') {
        destArray = await pdfDocument.getDestination(item.dest);
      }
      
      if (destArray && destArray[0]) {
        const pageIndex = await pdfDocument.getPageIndex(destArray[0]);
        goToPage(pageIndex + 1);
      }
    } catch (e) {
      console.error('Error navigating to bookmark:', e);
    }
  };

  const renderOutlineItems = (items: OutlineItem[], depth = 0): React.ReactNode => {
    return items.map((item, index) => (
      <div key={index}>
        <button
          onClick={() => handleOutlineItemClick(item)}
          className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors truncate"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          title={item.title}
        >
          {item.title}
        </button>
        {item.items && item.items.length > 0 && renderOutlineItems(item.items, depth + 1)}
      </div>
    ));
  };

  const getBasePageWidth = () => {
    if (isFullscreen) {
      return Math.min(900, window.innerWidth - (showSidebar ? 280 : 80));
    }
    return Math.min(700, window.innerWidth - (showSidebar ? 300 : 100));
  };

  const setPageRef = (pageNum: number) => (el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el);
    } else {
      pageRefs.current.delete(pageNum);
    }
  };

  const clearHighlights = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Remove overlay highlights
    const overlays = container.querySelectorAll('.pdf-highlight-overlay');
    overlays.forEach(el => el.remove());
  };

  const performSearch = () => {
    if (!searchText.trim()) {
      clearHighlights();
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    // Clear previous highlights
    clearHighlights();

    const results: { pageNum: number; element: HTMLElement }[] = [];
    const searchLower = searchText.toLowerCase();

    // Find all text layer spans and create overlay highlights
    pageRefs.current.forEach((pageEl, pageNum) => {
      const textLayer = pageEl.querySelector('.react-pdf__Page__textContent') as HTMLElement;
      if (!textLayer) return;

      const spans = textLayer.querySelectorAll('span');
      spans.forEach((span) => {
        const text = span.textContent || '';
        const textLower = text.toLowerCase();
        
        let startIndex = 0;
        while ((startIndex = textLower.indexOf(searchLower, startIndex)) !== -1) {
          // Create a range for the matched text
          const range = document.createRange();
          const textNode = span.firstChild;
          
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            try {
              range.setStart(textNode, startIndex);
              range.setEnd(textNode, startIndex + searchText.length);
              
              const rects = range.getClientRects();
              const textLayerRect = textLayer.getBoundingClientRect();
              
              for (let i = 0; i < rects.length; i++) {
                const rect = rects[i];
                const highlight = document.createElement('div');
                highlight.className = 'pdf-highlight-overlay';
                highlight.style.cssText = `
                  position: absolute;
                  left: ${rect.left - textLayerRect.left}px;
                  top: ${rect.top - textLayerRect.top}px;
                  width: ${rect.width}px;
                  height: ${rect.height}px;
                  background-color: #93c5fd;
                  opacity: 0.5;
                  pointer-events: none;
                  border-radius: 2px;
                  z-index: 1;
                `;
                textLayer.appendChild(highlight);
                results.push({ pageNum, element: highlight });
              }
            } catch (e) {
              // Range error - skip this match
            }
          }
          
          startIndex += searchText.length;
        }
      });
    });

    setSearchResults(results.map((r, i) => ({ pageNum: r.pageNum, index: i })));
    setCurrentSearchIndex(0);

    // Scroll to first result and highlight it
    if (results.length > 0) {
      highlightCurrentResult(0);
      results[0].element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const highlightCurrentResult = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const highlights = container.querySelectorAll('.pdf-highlight-overlay') as NodeListOf<HTMLElement>;
    highlights.forEach((el, i) => {
      if (i === index) {
        el.style.backgroundColor = '#3b82f6';
        el.style.opacity = '0.5';
        el.style.boxShadow = '0 0 0 2px #3b82f6';
      } else {
        el.style.backgroundColor = '#93c5fd';
        el.style.opacity = '0.5';
        el.style.boxShadow = 'none';
      }
    });
  };

  const scrollToResult = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const highlights = container.querySelectorAll('.pdf-highlight-overlay') as NodeListOf<HTMLElement>;
    if (highlights[index]) {
      highlightCurrentResult(index);
      highlights[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToResult(nextIndex);
  };

  const goToPrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    scrollToResult(prevIndex);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        goToPrevResult();
      } else if (searchResults.length > 0) {
        goToNextResult();
      } else {
        performSearch();
      }
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
        <DialogHeader className="flex flex-row items-center gap-2 pr-10 py-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium truncate flex-1 min-w-0">
            {isImage ? <ImageIcon className="h-4 w-4 flex-shrink-0" /> : <FileText className="h-4 w-4 flex-shrink-0" />}
            <span className="truncate">{fileName}</span>
          </DialogTitle>
          
          {/* Integrated zoom controls for PDF */}
          {isPdf && pdfUrl && !pdfError && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSearch(!showSearch)} title="Keresés (Ctrl+F)">
                <Search className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} disabled={zoomIndex <= 0} title="Kicsinyítés">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <button onClick={resetZoom} className="px-1.5 text-xs font-medium hover:bg-muted rounded min-w-[40px] text-center h-7" title="Eredeti méret">
                {Math.round(zoom * 100)}%
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} disabled={zoomIndex >= ZOOM_LEVELS.length - 1} title="Nagyítás">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rotatePages} title="Forgatás (90°)">
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {isPdf && pdfUrl && !pdfError && (
              <>
                <Button 
                  variant={showSidebar ? "secondary" : "ghost"} 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={() => setShowSidebar(!showSidebar)} 
                  title={showSidebar ? 'Oldalsáv elrejtése' : 'Oldalsáv megjelenítése'}
                >
                  {showSidebar ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrint} title="Nyomtatás">
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen} title={isFullscreen ? 'Kilépés teljes képernyőből' : 'Teljes képernyő'}>
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={onDownload}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Letöltés
            </Button>
          </div>
        </DialogHeader>

        {/* Search bar */}
        {showSearch && isPdf && (
          <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Keresés a dokumentumban..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-7 text-sm flex-1"
            />
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={performSearch}>
              Keresés
            </Button>
            {searchResults.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {currentSearchIndex + 1} / {searchResults.length}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToPrevResult} title="Előző">
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToNextResult} title="Következő">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowSearch(false); setSearchText(''); clearHighlights(); setSearchResults([]); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

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
            <div className="flex w-full h-full">
              {/* Sidebar with thumbnails and bookmarks */}
              {showSidebar && (
                <div className="w-48 flex-shrink-0 border-r border-border bg-background flex flex-col">
                  <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as 'thumbnails' | 'bookmarks')} className="flex flex-col h-full">
                    <TabsList className="grid w-full grid-cols-2 h-8 rounded-none border-b">
                      <TabsTrigger value="thumbnails" className="text-xs h-7 gap-1">
                        <Grid3X3 className="h-3 w-3" />
                        Oldalak
                      </TabsTrigger>
                      <TabsTrigger value="bookmarks" className="text-xs h-7 gap-1" disabled={!outline || outline.length === 0}>
                        <BookOpen className="h-3 w-3" />
                        Könyvjelzők
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="thumbnails" className="flex-1 m-0 overflow-hidden">
                      <ScrollArea className={`${isFullscreen ? 'h-[82vh]' : showSearch ? 'h-[62vh]' : 'h-[69vh]'}`}>
                        <div className="flex flex-col gap-2 p-2">
                          <Document file={pdfUrl}>
                            {numPages && Array.from({ length: numPages }, (_, index) => (
                              <button
                                key={`thumb_${index + 1}`}
                                onClick={() => goToPage(index + 1)}
                                className={`relative p-1 rounded border transition-all ${
                                  currentPage === index + 1 
                                    ? 'border-primary ring-2 ring-primary/30' 
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <Page
                                  pageNumber={index + 1}
                                  width={140}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                                <div className="absolute bottom-2 right-2 bg-background/80 text-xs px-1.5 py-0.5 rounded">
                                  {index + 1}
                                </div>
                              </button>
                            ))}
                          </Document>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="bookmarks" className="flex-1 m-0 overflow-hidden">
                      <ScrollArea className={`${isFullscreen ? 'h-[82vh]' : showSearch ? 'h-[62vh]' : 'h-[69vh]'}`}>
                        <div className="py-2">
                          {outline && outline.length > 0 ? (
                            renderOutlineItems(outline)
                          ) : (
                            <div className="p-4 text-xs text-muted-foreground text-center">
                              Nincsenek könyvjelzők
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Main PDF view */}
              <div className="flex-1 relative flex flex-col">
                {/* Page indicator with jump input - floating */}
                {numPages && numPages > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-background/90 backdrop-blur-sm rounded px-3 py-1.5 shadow-lg border border-border flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={numPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          goToPage(parseInt(pageInput, 10));
                        }
                      }}
                      onBlur={() => goToPage(parseInt(pageInput, 10))}
                      className="w-12 h-6 text-xs text-center bg-muted border border-border rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs font-medium text-muted-foreground">/ {numPages}</span>
                  </div>
                )}

                <div
                  ref={scrollContainerRef}
                  className={`overflow-auto w-full ${isFullscreen ? 'h-[88vh]' : showSearch ? 'h-[68vh]' : 'h-[75vh]'} flex justify-center pb-10`}
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
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="shadow-lg pdf-page-with-annotations select-text"
                            width={getBasePageWidth() * zoom}
                            rotate={rotation}
                          />
                        </div>
                      ))}
                    </div>
                  </Document>
                </div>
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
