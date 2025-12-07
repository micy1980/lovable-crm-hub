import { useState, useEffect, useRef } from 'react';
import { Download, Loader2, FileSpreadsheet, Maximize2, Minimize2, ZoomIn, ZoomOut, Printer, Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface ExcelPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  fileName: string;
  onDownload: () => void;
}

interface SheetData {
  name: string;
  data: any[][];
  merges?: XLSX.Range[];
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 2;

export const ExcelPreview = ({
  open,
  onOpenChange,
  filePath,
  fileName,
  onDownload,
}: ExcelPreviewProps) => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<{ sheet: string; row: number; col: number }[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    if (open) {
      void loadDocument();
    } else {
      setSheets([]);
      setActiveSheet('');
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && sheets.length > 0) {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchText('');
        setSearchResults([]);
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, sheets.length, showSearch]);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      const arrayBuffer = await data.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheetsData: SheetData[] = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
        return {
          name,
          data: jsonData,
          merges: sheet['!merges']
        };
      });
      
      setSheets(sheetsData);
      if (sheetsData.length > 0) {
        setActiveSheet(sheetsData[0].name);
      }
    } catch (err: any) {
      setError('Nem sikerült betölteni a dokumentumot: ' + (err?.message ?? 'ismeretlen hiba'));
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSheets([]);
      setActiveSheet('');
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

  const performSearch = () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    const results: { sheet: string; row: number; col: number }[] = [];
    const searchLower = searchText.toLowerCase();

    sheets.forEach((sheet) => {
      sheet.data.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (String(cell).toLowerCase().includes(searchLower)) {
            results.push({ sheet: sheet.name, row: rowIndex, col: colIndex });
          }
        });
      });
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);

    if (results.length > 0) {
      setActiveSheet(results[0].sheet);
      scrollToCell(results[0].row, results[0].col);
    }
  };

  const scrollToCell = (row: number, col: number) => {
    if (!tableRef.current) return;
    const cell = tableRef.current.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  };

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    const result = searchResults[nextIndex];
    setActiveSheet(result.sheet);
    setTimeout(() => scrollToCell(result.row, result.col), 100);
  };

  const goToPrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    const result = searchResults[prevIndex];
    setActiveSheet(result.sheet);
    setTimeout(() => scrollToCell(result.row, result.col), 100);
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

  const isCellHighlighted = (sheetName: string, row: number, col: number): boolean => {
    return searchResults.some((r) => r.sheet === sheetName && r.row === row && r.col === col);
  };

  const isCurrentResult = (sheetName: string, row: number, col: number): boolean => {
    if (searchResults.length === 0) return false;
    const current = searchResults[currentSearchIndex];
    return current.sheet === sheetName && current.row === row && current.col === col;
  };

  const handlePrint = async () => {
    if (sheets.length === 0) return;
    setIsPrinting(true);

    try {
      const currentSheet = sheets.find((s) => s.name === activeSheet);
      if (!currentSheet) return;

      const tableHtml = generateTableHtml(currentSheet);

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
              <title>${fileName} - ${activeSheet}</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
                th { background: #f5f5f5; font-weight: 600; }
                tr:nth-child(even) { background: #fafafa; }
                @media print {
                  body { margin: 0; padding: 10px; }
                }
              </style>
            </head>
            <body>
              <h2 style="margin-bottom: 16px;">${fileName} - ${activeSheet}</h2>
              ${tableHtml}
            </body>
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

  const generateTableHtml = (sheet: SheetData): string => {
    if (sheet.data.length === 0) return '<p>Üres munkalap</p>';

    const maxCols = Math.max(...sheet.data.map((row) => row.length));
    
    let html = '<table>';
    sheet.data.forEach((row, rowIndex) => {
      html += '<tr>';
      for (let colIndex = 0; colIndex < maxCols; colIndex++) {
        const cell = row[colIndex] ?? '';
        const tag = rowIndex === 0 ? 'th' : 'td';
        html += `<${tag}>${escapeHtml(String(cell))}</${tag}>`;
      }
      html += '</tr>';
    });
    html += '</table>';
    
    return html;
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const currentSheet = sheets.find((s) => s.name === activeSheet);
  const maxCols = currentSheet ? Math.max(...currentSheet.data.map((row) => row.length), 0) : 0;

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
            <FileSpreadsheet className="h-4 w-4 flex-shrink-0 text-green-600" />
            <span className="truncate">{fileName}</span>
          </DialogTitle>

          {sheets.length > 0 && (
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
            {sheets.length > 0 && (
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
          <DialogDescription className="sr-only">Excel dokumentum előnézet</DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        {showSearch && (
          <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Keresés a táblázatban..."
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
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowSearch(false); setSearchText(''); setSearchResults([]); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className={`flex-1 overflow-hidden ${isFullscreen ? 'h-[88vh]' : showSearch ? 'h-[68vh]' : 'h-[75vh]'}`}>
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Táblázat betöltése...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center gap-2 text-destructive h-full">
              <FileSpreadsheet className="h-8 w-8" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && sheets.length > 0 && (
            <Tabs value={activeSheet} onValueChange={setActiveSheet} className="h-full flex flex-col">
              <TabsList className="w-full justify-start overflow-x-auto flex-shrink-0">
                {sheets.map((sheet) => (
                  <TabsTrigger key={sheet.name} value={sheet.name} className="text-xs">
                    {sheet.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {sheets.map((sheet) => (
                <TabsContent key={sheet.name} value={sheet.name} className="flex-1 m-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div
                      ref={sheet.name === activeSheet ? tableRef : undefined}
                      className="p-2"
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        width: `${100 / zoom}%`
                      }}
                    >
                      {sheet.data.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">Üres munkalap</div>
                      ) : (
                        <table className="w-full border-collapse text-sm">
                          <tbody>
                            {sheet.data.map((row, rowIndex) => (
                              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-muted font-semibold' : rowIndex % 2 === 0 ? 'bg-muted/30' : ''}>
                                {Array.from({ length: maxCols }).map((_, colIndex) => {
                                  const cell = row[colIndex] ?? '';
                                  const isHighlighted = isCellHighlighted(sheet.name, rowIndex, colIndex);
                                  const isCurrent = isCurrentResult(sheet.name, rowIndex, colIndex);
                                  
                                  return (
                                    <td
                                      key={colIndex}
                                      data-row={rowIndex}
                                      data-col={colIndex}
                                      className={`border border-border px-2 py-1 ${
                                        isCurrent
                                          ? 'bg-blue-500 text-white'
                                          : isHighlighted
                                          ? 'bg-blue-200 dark:bg-blue-800'
                                          : ''
                                      }`}
                                    >
                                      {String(cell)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
