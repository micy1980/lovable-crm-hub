import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';

interface ExportMenuProps {
  data: any[];
  columns: { header: string; key: string }[];
  title: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const ExportMenu = ({ data, columns, title, variant = 'outline', size = 'default' }: ExportMenuProps) => {
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    try {
      if (!data || data.length === 0) {
        toast.error('Nincs exportálható adat');
        return;
      }

      switch (format) {
        case 'pdf':
          exportToPDF(data, columns, title);
          break;
        case 'excel':
          exportToExcel(data, columns, title);
          break;
        case 'csv':
          exportToCSV(data, columns, title);
          break;
      }

      toast.success(`${format.toUpperCase()} exportálás sikeres`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Hiba történt az exportálás során');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <Table className="h-4 w-4 mr-2" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
