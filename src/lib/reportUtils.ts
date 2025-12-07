import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';

// Types for reports
export interface ReportSummary {
  label: string;
  value: string | number;
}

export interface ReportSection {
  title: string;
  data: any[];
  columns: { header: string; key: string; format?: 'date' | 'currency' | 'boolean' | 'number' }[];
}

export interface DetailedReport {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  summaries: ReportSummary[];
  sections: ReportSection[];
}

const formatValue = (value: any, formatType?: string): string => {
  if (value === null || value === undefined) return '-';
  if (formatType === 'date' && value) {
    try {
      return format(new Date(value), 'yyyy.MM.dd', { locale: hu });
    } catch {
      return String(value);
    }
  }
  if (formatType === 'boolean') return value ? 'Igen' : 'Nem';
  if (formatType === 'currency') {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return String(value);
    return new Intl.NumberFormat('hu-HU').format(num);
  }
  if (formatType === 'number') {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return String(value);
    return new Intl.NumberFormat('hu-HU').format(num);
  }
  return String(value);
};

// Generate detailed PDF report
export const generateDetailedPDFReport = (report: DetailedReport) => {
  const doc = new jsPDF();
  let yPosition = 20;
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(report.title, 14, yPosition);
  yPosition += 8;
  
  // Subtitle
  if (report.subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(report.subtitle, 14, yPosition);
    yPosition += 6;
  }
  
  // Generated date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generálva: ${format(report.generatedAt, 'yyyy.MM.dd HH:mm', { locale: hu })}`, 14, yPosition);
  doc.setTextColor(0);
  yPosition += 12;
  
  // Summary section
  if (report.summaries.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Összesítés', 14, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    report.summaries.forEach((summary, index) => {
      const xPos = 14 + (index % 3) * 60;
      if (index > 0 && index % 3 === 0) {
        yPosition += 12;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${summary.label}:`, xPos, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(String(summary.value), xPos + doc.getTextWidth(`${summary.label}: `), yPosition);
    });
    yPosition += 16;
  }
  
  // Data sections
  report.sections.forEach((section) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Section title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, 14, yPosition);
    yPosition += 6;
    
    if (section.data.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Nincs adat', 14, yPosition);
      yPosition += 10;
    } else {
      // Table
      const tableData = section.data.map(item =>
        section.columns.map(col => formatValue(item[col.key], col.format))
      );
      
      autoTable(doc, {
        head: [section.columns.map(col => col.header)],
        body: tableData,
        startY: yPosition,
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  });
  
  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${i} / ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save
  const fileName = `${report.title.toLowerCase().replace(/ /g, '-')}-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
  doc.save(fileName);
};

// Generate detailed Excel report
export const generateDetailedExcelReport = (report: DetailedReport) => {
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  if (report.summaries.length > 0) {
    const summaryData = [
      [report.title],
      [report.subtitle || ''],
      [`Generálva: ${format(report.generatedAt, 'yyyy.MM.dd HH:mm', { locale: hu })}`],
      [],
      ['Összesítés'],
      ...report.summaries.map(s => [s.label, String(s.value)])
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Összesítés');
  }
  
  // Data sheets
  report.sections.forEach((section, index) => {
    const sheetData = [
      section.columns.map(col => col.header),
      ...section.data.map(item =>
        section.columns.map(col => {
          const value = item[col.key];
          if (col.format === 'date' && value) {
            try {
              return format(new Date(value), 'yyyy.MM.dd', { locale: hu });
            } catch {
              return value;
            }
          }
          if (col.format === 'boolean') return value ? 'Igen' : 'Nem';
          return value ?? '';
        })
      )
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    sheet['!cols'] = section.columns.map(() => ({ wch: 15 }));
    
    // Sheet name (max 31 chars)
    const sheetName = section.title.substring(0, 31).replace(/[\\/*?[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName || `Adatok${index + 1}`);
  });
  
  // Save
  const fileName = `${report.title.toLowerCase().replace(/ /g, '-')}-${format(new Date(), 'yyyyMMdd-HHmmss')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// Project report generator
export const generateProjectsReport = (
  projects: any[],
  tasks: any[],
  options: { includeCompleted?: boolean; dateFrom?: Date; dateTo?: Date } = {}
): DetailedReport => {
  const filteredProjects = projects.filter(p => {
    if (!options.includeCompleted && p.status === 'completed') return false;
    return true;
  });
  
  const totalProjects = filteredProjects.length;
  const activeProjects = filteredProjects.filter(p => p.status === 'active').length;
  const completedProjects = filteredProjects.filter(p => p.status === 'completed').length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed').length;
  
  return {
    title: 'Projektek Riport',
    subtitle: options.dateFrom && options.dateTo 
      ? `${format(options.dateFrom, 'yyyy.MM.dd')} - ${format(options.dateTo, 'yyyy.MM.dd')}`
      : undefined,
    generatedAt: new Date(),
    summaries: [
      { label: 'Összes projekt', value: totalProjects },
      { label: 'Aktív', value: activeProjects },
      { label: 'Befejezett', value: completedProjects },
      { label: 'Összes feladat', value: totalTasks },
      { label: 'Befejezett feladat', value: completedTasks },
      { label: 'Lejárt feladat', value: overdueTasks },
    ],
    sections: [
      {
        title: 'Projektek',
        data: filteredProjects,
        columns: [
          { header: 'Kód', key: 'code' },
          { header: 'Név', key: 'name' },
          { header: 'Státusz', key: 'status' },
          { header: 'Partner', key: 'partner_name' },
          { header: 'Létrehozva', key: 'created_at', format: 'date' },
        ],
      },
      {
        title: 'Aktív feladatok',
        data: tasks.filter(t => t.status !== 'completed'),
        columns: [
          { header: 'Feladat', key: 'title' },
          { header: 'Projekt', key: 'project_name' },
          { header: 'Határidő', key: 'deadline', format: 'date' },
          { header: 'Státusz', key: 'status' },
          { header: 'Felelős', key: 'responsible_name' },
        ],
      },
    ],
  };
};

// Sales report generator
export const generateSalesReport = (
  sales: any[],
  options: { includeWon?: boolean; includeLost?: boolean; dateFrom?: Date; dateTo?: Date } = {}
): DetailedReport => {
  const filteredSales = sales.filter(s => {
    if (!options.includeWon && s.status === 'won') return false;
    if (!options.includeLost && s.status === 'lost') return false;
    return true;
  });
  
  const totalSales = filteredSales.length;
  const activeSales = filteredSales.filter(s => !['won', 'lost'].includes(s.status)).length;
  const wonSales = filteredSales.filter(s => s.status === 'won').length;
  const lostSales = filteredSales.filter(s => s.status === 'lost').length;
  const totalValue = filteredSales.reduce((sum, s) => sum + (s.expected_value || 0), 0);
  const wonValue = filteredSales.filter(s => s.status === 'won').reduce((sum, s) => sum + (s.expected_value || 0), 0);
  
  // Group by status
  const byStatus: Record<string, any[]> = {};
  filteredSales.forEach(s => {
    const status = s.status || 'unknown';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(s);
  });
  
  return {
    title: 'Értékesítés Riport',
    subtitle: options.dateFrom && options.dateTo 
      ? `${format(options.dateFrom, 'yyyy.MM.dd')} - ${format(options.dateTo, 'yyyy.MM.dd')}`
      : undefined,
    generatedAt: new Date(),
    summaries: [
      { label: 'Összes', value: totalSales },
      { label: 'Aktív', value: activeSales },
      { label: 'Nyert', value: wonSales },
      { label: 'Elveszett', value: lostSales },
      { label: 'Összes érték', value: new Intl.NumberFormat('hu-HU').format(totalValue) },
      { label: 'Nyert érték', value: new Intl.NumberFormat('hu-HU').format(wonValue) },
    ],
    sections: [
      {
        title: 'Értékesítések',
        data: filteredSales,
        columns: [
          { header: 'Név', key: 'name' },
          { header: 'Partner', key: 'partner_name' },
          { header: 'Státusz', key: 'status' },
          { header: 'Várható érték', key: 'expected_value', format: 'currency' },
          { header: 'Pénznem', key: 'currency' },
          { header: 'Várható zárás', key: 'expected_close_date', format: 'date' },
        ],
      },
    ],
  };
};

// Partners report generator
export const generatePartnersReport = (
  partners: any[],
  options: { category?: string } = {}
): DetailedReport => {
  const filteredPartners = options.category 
    ? partners.filter(p => p.category === options.category)
    : partners;
  
  const totalPartners = filteredPartners.length;
  
  // Group by category
  const byCategory: Record<string, number> = {};
  filteredPartners.forEach(p => {
    const cat = p.category || 'Nincs kategória';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });
  
  const summaries: ReportSummary[] = [
    { label: 'Összes partner', value: totalPartners },
    ...Object.entries(byCategory).slice(0, 5).map(([cat, count]) => ({
      label: cat,
      value: count,
    })),
  ];
  
  return {
    title: 'Partnerek Riport',
    subtitle: options.category ? `Kategória: ${options.category}` : undefined,
    generatedAt: new Date(),
    summaries,
    sections: [
      {
        title: 'Partnerek',
        data: filteredPartners,
        columns: [
          { header: 'Név', key: 'name' },
          { header: 'Kategória', key: 'category' },
          { header: 'Adószám', key: 'tax_id' },
          { header: 'Email', key: 'email' },
          { header: 'Telefon', key: 'phone' },
          { header: 'Pénznem', key: 'default_currency' },
        ],
      },
    ],
  };
};
