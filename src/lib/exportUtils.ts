import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// PDF Export
export const exportToPDF = (data: any[], columns: { header: string; key: string }[], title: string) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generálva: ${new Date().toLocaleDateString('hu-HU')}`, 14, 28);
  
  // Prepare table data
  const tableData = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'Igen' : 'Nem';
      if (value instanceof Date) return value.toLocaleDateString('hu-HU');
      return String(value);
    })
  );
  
  // Add table
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: tableData,
    startY: 35,
    styles: { font: 'helvetica', fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Save PDF
  doc.save(`${title.toLowerCase().replace(/ /g, '-')}-${Date.now()}.pdf`);
};

// Excel Export
export const exportToExcel = (data: any[], columns: { header: string; key: string }[], title: string) => {
  // Prepare data with headers
  const worksheetData = [
    columns.map(col => col.header),
    ...data.map(item => 
      columns.map(col => {
        const value = item[col.key];
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Igen' : 'Nem';
        if (value instanceof Date) return value.toLocaleDateString('hu-HU');
        return value;
      })
    )
  ];
  
  // Create worksheet and workbook
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title.substring(0, 31));
  
  // Save file
  XLSX.writeFile(workbook, `${title.toLowerCase().replace(/ /g, '-')}-${Date.now()}.xlsx`);
};

// CSV Export
export const exportToCSV = (data: any[], columns: { header: string; key: string }[], title: string) => {
  // Prepare CSV content
  const headers = columns.map(col => col.header).join(',');
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Igen' : 'Nem';
      if (value instanceof Date) return value.toLocaleDateString('hu-HU');
      // Escape commas and quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  ).join('\n');
  
  const csvContent = `${headers}\n${rows}`;
  
  // Create and download file
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${title.toLowerCase().replace(/ /g, '-')}-${Date.now()}.csv`;
  link.click();
};
