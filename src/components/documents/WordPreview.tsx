import { useState, useEffect, useRef } from 'react';
import { Download, Loader2, FileText, Maximize2, Minimize2, ZoomIn, ZoomOut, Printer, Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import mammoth from 'mammoth';

interface WordPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  fileName: string;
  onDownload: () => void;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 2;

export const WordPreview = ({
  open,
  onOpenChange,
  filePath,
  fileName,
  onDownload,
}: WordPreviewProps) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Range[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    if (open) {
      void loadDocument();
    } else {
      setHtmlContent(null);
      setError(null);
      setIsFullscreen(false);
      setZoomIndex(DEFAULT_ZOOM_INDEX);
      setShowSearch(false);
      setSearchText('');
      setSearchResults([]);
    }
  }, [open, filePath]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && htmlContent) {
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
  }, [open, htmlContent, showSearch]);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      const arrayBuffer = await data.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      // Add custom styles to the HTML content
      const styledHtml = `
        <style>
          .word-content { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: inherit; }
          .word-content p { margin: 0 0 1em 0; }
          .word-content h1, .word-content h2, .word-content h3, .word-content h4, .word-content h5, .word-content h6 { margin: 1.5em 0 0.5em 0; font-weight: 600; }
          .word-content h1 { font-size: 2em; }
          .word-content h2 { font-size: 1.5em; }
          .word-content h3 { font-size: 1.25em; }
          .word-content ul, .word-content ol { margin: 0 0 1em 2em; padding: 0; }
          .word-content li { margin: 0.25em 0; }
          .word-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          .word-content th, .word-content td { border: 1px solid hsl(var(--border)); padding: 0.5em; text-align: left; }
          .word-content th { background: hsl(var(--muted)); font-weight: 600; }
          .word-content img { max-width: 100%; height: auto; }
          .word-content a { color: hsl(var(--primary)); text-decoration: underline; }
          .word-content blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid hsl(var(--border)); color: hsl(var(--muted-foreground)); }
          .search-highlight { background-color: #93c5fd; opacity: 0.8; }
          .search-highlight-current { background-color: #3b82f6; color: white; }
        </style>
        <div class="word-content">${result.value}</div>
      `;
      
      setHtmlContent(styledHtml);
    } catch (err: any) {
      setError('Nem sikerült betölteni a dokumentumot: ' + (err?.message ?? 'ismeretlen hiba'));
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setHtmlContent(null);
      setError(null);
      setIsFullscreen(false);
      setZoomIndex(DEFAULT_ZOOM_INDEX);
    }
    onOpenChange(nextOpen);
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

  const clearHighlights = () => {
    if (!contentRef.current) return;
    const highlights = contentRef.current.querySelectorAll('.search-highlight, .search-highlight-current');
    highlights.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });
  };

  const performSearch = () => {
    if (!contentRef.current || !searchText.trim()) {
      setSearchResults([]);
      return;
    }

    clearHighlights();
    
    const text = searchText.toLowerCase();
    const treeWalker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    const matches: { node: Text; index: number }[] = [];
    let node: Text | null;
    
    while ((node = treeWalker.nextNode() as Text)) {
      const content = node.textContent?.toLowerCase() || '';
      let index = 0;
      while ((index = content.indexOf(text, index)) !== -1) {
        matches.push({ node, index });
        index += text.length;
      }
    }

    // Highlight matches (reverse order to preserve indices)
    const ranges: Range[] = [];
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const range = document.createRange();
      range.setStart(match.node, match.index);
      range.setEnd(match.node, match.index + searchText.length);
      
      const span = document.createElement('span');
      span.className = 'search-highlight';
      range.surroundContents(span);
      ranges.unshift(range);
    }

    setSearchResults(ranges);
    setCurrentSearchIndex(0);
    
    if (ranges.length > 0) {
      const firstHighlight = contentRef.current.querySelector('.search-highlight');
      if (firstHighlight) {
        firstHighlight.classList.add('search-highlight-current');
        firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const goToResult = (index: number) => {
    if (!contentRef.current) return;
    
    const highlights = contentRef.current.querySelectorAll('.search-highlight, .search-highlight-current');
    highlights.forEach((el) => {
      el.classList.remove('search-highlight-current');
      el.classList.add('search-highlight');
    });
    
    const target = highlights[index];
    if (target) {
      target.classList.remove('search-highlight');
      target.classList.add('search-highlight-current');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    goToResult(nextIndex);
  };

  const goToPrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    goToResult(prevIndex);
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

  const handlePrint = async () => {
    if (!htmlContent) return;
    setIsPrinting(true);

    try {
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
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; padding: 20px; }
                @media print {
                  body { margin: 0; padding: 20px; }
                }
              </style>
            </head>
            <body>${htmlContent}</body>
          </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setIsPrinting(false);
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      }
    } catch (err) {
      console.error('Print error:', err);
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        className={`flex flex-col z-[100] ${
          isFullscreen
            ? 'max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh]'
            : 'max-w-5xl w-[90vw] max-h-[90vh]'
        }`}
      >
        <DialogHeader className="flex flex-row items-center gap-2 pr-10 py-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium truncate flex-1 min-w-0">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{fileName}</span>
          </DialogTitle>

          {htmlContent && (
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
            </div>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            {htmlContent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePrint}
                title={isPrinting ? 'Nyomtatás előkészítése...' : 'Nyomtatás'}
                disabled={isPrinting}
              >
                {isPrinting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen} title={isFullscreen ? 'Kilépés teljes képernyőből' : 'Teljes képernyő'}>
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={onDownload}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Letöltés
            </Button>
          </div>
          <DialogDescription className="sr-only">Word dokumentum előnézet</DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        {showSearch && (
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
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowSearch(false); setSearchText(''); clearHighlights(); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className={`flex-1 overflow-hidden ${isFullscreen ? 'h-[88vh]' : showSearch ? 'h-[68vh]' : 'h-[75vh]'}`}>
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Dokumentum betöltése...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center gap-2 text-destructive h-full">
              <FileText className="h-8 w-8" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && htmlContent && (
            <ScrollArea className="h-full">
              <div
                ref={contentRef}
                className="p-6 bg-background"
                style={{ 
                  transform: `scale(${zoom})`, 
                  transformOrigin: 'top left',
                  width: `${100 / zoom}%`
                }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
