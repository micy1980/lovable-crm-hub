import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { History, Download, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ContractFile } from '@/hooks/useContractFiles';

interface ContractFileVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: ContractFile | null;
  getVersions: (fileId: string) => Promise<ContractFile[]>;
  onDownload: (filePath: string, fileName: string) => void;
  onRestore: (versionId: string) => void;
  isAdmin: boolean;
}

export const ContractFileVersionsDialog = ({
  open,
  onOpenChange,
  file,
  getVersions,
  onDownload,
  onRestore,
  isAdmin,
}: ContractFileVersionsDialogProps) => {
  const [versions, setVersions] = useState<ContractFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && file) {
      loadVersions();
    }
  }, [open, file]);

  const loadVersions = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await getVersions(file.id);
      setVersions(data);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(parseISO(date), 'yyyy.MM.dd HH:mm', { locale: hu });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Verzióelőzmények: {file?.title}
          </DialogTitle>
          <DialogDescription>
            A fájl korábbi verzióinak megtekintése és visszaállítása.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nincsenek korábbi verziók.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Verzió</TableHead>
                <TableHead>Méret</TableHead>
                <TableHead>Feltöltve</TableHead>
                <TableHead>Feltöltő</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      v{version.version_number}
                      {version.is_current && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Aktuális
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatFileSize(version.file_size)}</TableCell>
                  <TableCell>{formatDate(version.created_at)}</TableCell>
                  <TableCell>{version.uploader?.full_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => version.file_path && onDownload(version.file_path, `${version.title}_v${version.version_number}`)}
                        disabled={!version.file_path}
                        title="Letöltés"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {isAdmin && !version.is_current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRestore(version.id)}
                          title="Visszaállítás"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};