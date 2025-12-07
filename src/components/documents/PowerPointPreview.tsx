import { useState, useEffect, useRef } from 'react';
import { Download, Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut, Printer, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';

interface PowerPointPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  fileName: string;
  onDownload: () => void;
}

interface Slide {
  index: number;
  texts: string[];
  images: { data: string; contentType: string }[];
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 2;

export const PowerPointPreview = ({
  open,
  onOpenChange,
  filePath,
  fileName,
  onDownload,
}: PowerPointPreviewProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    if (open && filePath) {
      loadPresentation();
    } else {
      setSlides([]);
      setCurrentSlide(0);
      setError(null);
      setIsFullscreen(false);
      setZoomIndex(DEFAULT_ZOOM_INDEX);
      setSearchText('');
      setShowSearch(false);
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
      if (!open) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchText('');
        setSearchResults([]);
      }
      if (e.key === 'ArrowLeft' && !showSearch) {
        prevSlide();
      }
      if (e.key === 'ArrowRight' && !showSearch) {
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, showSearch, currentSlide, slides.length]);

  const loadPresentation = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      const arrayBuffer = await data.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const parsedSlides: Slide[] = [];
      const slideFiles: string[] = [];

      // Find all slide files
      zip.forEach((relativePath) => {
        if (relativePath.match(/ppt\/slides\/slide\d+\.xml$/)) {
          slideFiles.push(relativePath);
        }
      });

      // Sort slides by number
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
        return numA - numB;
      });

      // Parse each slide
      for (let i = 0; i < slideFiles.length; i++) {
        const slideXml = await zip.file(slideFiles[i])?.async('string');
        if (slideXml) {
          const texts = extractTextsFromSlideXml(slideXml);
          
          // Try to extract images referenced in the slide
          const images: { data: string; contentType: string }[] = [];
          const relsPath = slideFiles[i].replace('ppt/slides/', 'ppt/slides/_rels/').replace('.xml', '.xml.rels');
          const relsFile = zip.file(relsPath);
          
          if (relsFile) {
            const relsXml = await relsFile.async('string');
            const imageRefs = extractImageRefsFromRels(relsXml);
            
            for (const imageRef of imageRefs) {
              const imagePath = `ppt/slides/${imageRef}`.replace('../', 'ppt/');
              const imageFile = zip.file(imagePath);
              if (imageFile) {
                const imageData = await imageFile.async('base64');
                const ext = imagePath.split('.').pop()?.toLowerCase();
                const contentType = ext === 'png' ? 'image/png' : 
                                   ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                                   ext === 'gif' ? 'image/gif' : 'image/png';
                images.push({ data: `data:${contentType};base64,${imageData}`, contentType });
              }
            }
          }

          parsedSlides.push({
            index: i + 1,
            texts,
            images,
          });
        }
      }

      setSlides(parsedSlides);
    } catch (err: any) {
      console.error('PowerPoint load error:', err);
      setError('Nem sikerült betölteni a prezentációt: ' + (err?.message || 'ismeretlen hiba'));
    } finally {
      setLoading(false);
    }
  };

  const extractTextsFromSlideXml = (xml: string): string[] => {
    const texts: string[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    // Extract text from a:t elements (text content)
    const textElements = doc.getElementsByTagName('a:t');
    for (let i = 0; i < textElements.length; i++) {
      const text = textElements[i].textContent?.trim();
      if (text) {
        texts.push(text);
      }
    }
    
    return texts;
  };

  const extractImageRefsFromRels = (xml: string): string[] => {
    const refs: string[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const relationships = doc.getElementsByTagName('Relationship');
    for (let i = 0; i < relationships.length; i++) {
      const type = relationships[i].getAttribute('Type');
      const target = relationships[i].getAttribute('Target');
      if (type?.includes('image') && target) {
        refs.push(target);
      }
    }
    
    return refs;
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
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

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const lowerText = text.toLowerCase();
    const results: number[] = [];

    slides.forEach((slide, index) => {
      const hasMatch = slide.texts.some(t => t.toLowerCase().includes(lowerText));
      if (hasMatch) {
        results.push(index);
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);
    if (results.length > 0) {
      setCurrentSlide(results[0]);
    }
  };

  const goToNextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    setCurrentSlide(searchResults[nextIndex]);
  };

  const goToPrevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    setCurrentSlide(searchResults[prevIndex]);
  };

  const handlePrint = () => {
    const printContent = slides.map((slide, idx) => `
      <div style="page-break-after: ${idx < slides.length - 1 ? 'always' : 'auto'}; padding: 40px; min-height: 90vh; border: 1px solid #ccc; margin-bottom: 20px;">
        <h2 style="margin-bottom: 20px; color: #333;">Dia ${slide.index}</h2>
        ${slide.images.map(img => `<img src="${img.data}" style="max-width: 100%; max-height: 300px; margin-bottom: 10px;" />`).join('')}
        ${slide.texts.map(text => `<p style="margin: 8px 0; font-size: 16px;">${text}</p>`).join('')}
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${fileName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const highlightText = (text: string): React.ReactNode => {
    if (!searchText.trim()) return text;
    
    const lowerText = text.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    const index = lowerText.indexOf(lowerSearch);
    
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <mark className="bg-blue-400/50 px-0.5 rounded">{text.substring(index, index + searchText.length)}</mark>
        {text.substring(index + searchText.length)}
      </>
    );
  };

  const currentSlideData = slides[currentSlide];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isFullscreen ? 'max-w-[98vw] w-[98vw] h-[98vh] max-h-[98vh]' : 'max-w-4xl w-full max-h-[90vh]'} flex flex-col p-0`}
      >
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-sm font-medium truncate flex-1">
              {fileName}
            </DialogTitle>
            
            <div className="flex items-center gap-1">
              {/* Search toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
                title="Keresés (Ctrl+F)"
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Zoom controls */}
              <Button variant="ghost" size="sm" onClick={zoomOut} disabled={zoomIndex === 0}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={resetZoom} className="text-xs min-w-[50px]">
                {Math.round(zoom * 100)}%
              </Button>
              <Button variant="ghost" size="sm" onClick={zoomIn} disabled={zoomIndex === ZOOM_LEVELS.length - 1}>
                <ZoomIn className="h-4 w-4" />
              </Button>

              {/* Print */}
              <Button variant="ghost" size="sm" onClick={handlePrint} title="Nyomtatás">
                <Printer className="h-4 w-4" />
              </Button>

              {/* Fullscreen */}
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              {/* Download */}
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                Letöltés
              </Button>
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-muted rounded">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Keresés a prezentációban..."
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-7 text-sm flex-1"
              />
              {searchResults.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {currentSearchIndex + 1} / {searchResults.length}
                  </span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={goToPrevSearchResult}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={goToNextSearchResult}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  setShowSearch(false);
                  setSearchText('');
                  setSearchResults([]);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Slide thumbnails sidebar */}
          <div className="w-32 border-r bg-muted/30 flex-shrink-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
                {slides.map((slide, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-full p-2 rounded border text-xs text-left transition-colors ${
                      idx === currentSlide 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-muted'
                    } ${searchResults.includes(idx) ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    <div className="text-center text-muted-foreground mb-1">
                      Dia {slide.index}
                    </div>
                    <div className="text-[10px] line-clamp-3 text-muted-foreground">
                      {slide.texts.slice(0, 2).join(' ')}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main slide view */}
          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Letöltés
                </Button>
              </div>
            ) : currentSlideData ? (
              <>
                <ScrollArea className="flex-1">
                  <div className="p-4 flex justify-center">
                    <div 
                      className="bg-background border rounded-lg shadow-lg p-8 transition-transform"
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top center',
                        width: '800px',
                        minHeight: '450px',
                      }}
                    >
                      {/* Slide images */}
                      {currentSlideData.images.length > 0 && (
                        <div className="flex flex-wrap gap-4 mb-6 justify-center">
                          {currentSlideData.images.map((img, idx) => (
                            <img 
                              key={idx} 
                              src={img.data} 
                              alt={`Slide image ${idx + 1}`}
                              className="max-w-full max-h-64 object-contain rounded"
                            />
                          ))}
                        </div>
                      )}

                      {/* Slide texts */}
                      <div className="space-y-3">
                        {currentSlideData.texts.map((text, idx) => (
                          <p 
                            key={idx} 
                            className={`${idx === 0 ? 'text-2xl font-bold' : 'text-base'}`}
                          >
                            {highlightText(text)}
                          </p>
                        ))}
                      </div>

                      {currentSlideData.texts.length === 0 && currentSlideData.images.length === 0 && (
                        <p className="text-muted-foreground text-center">Üres dia</p>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* Navigation */}
                <div className="border-t px-4 py-2 flex items-center justify-center gap-4 bg-muted/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentSlide + 1} / {slides.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextSlide}
                    disabled={currentSlide === slides.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Nincs dia a prezentációban
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
