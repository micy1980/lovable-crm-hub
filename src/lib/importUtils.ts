import * as XLSX from 'xlsx';

export interface ImportColumn {
  key: string;
  header: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
  validate?: (value: any) => boolean | string;
}

export interface ImportResult {
  success: boolean;
  data: any[];
  errors: { row: number; column: string; message: string }[];
  warnings: { row: number; column: string; message: string }[];
}

export interface ImportConfig {
  columns: ImportColumn[];
  skipHeaderRow?: boolean;
}

// Parse uploaded file (CSV or Excel)
export const parseImportFile = async (file: File): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', dateNF: 'yyyy-mm-dd' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        resolve(jsonData as any[][]);
      } catch (error) {
        reject(new Error('Nem sikerült feldolgozni a fájlt'));
      }
    };
    
    reader.onerror = () => reject(new Error('Hiba a fájl olvasása közben'));
    reader.readAsArrayBuffer(file);
  });
};

// Validate and transform imported data
export const validateImportData = (
  rawData: any[][],
  config: ImportConfig,
  columnMapping: Record<string, number>
): ImportResult => {
  const errors: ImportResult['errors'] = [];
  const warnings: ImportResult['warnings'] = [];
  const data: any[] = [];
  
  // Start from row 1 if skipping header
  const startRow = config.skipHeaderRow ? 1 : 0;
  
  for (let rowIndex = startRow; rowIndex < rawData.length; rowIndex++) {
    const row = rawData[rowIndex];
    const rowNum = rowIndex + 1; // 1-indexed for display
    
    // Skip empty rows
    if (row.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue;
    }
    
    const rowData: Record<string, any> = {};
    let hasError = false;
    
    for (const column of config.columns) {
      const colIndex = columnMapping[column.key];
      
      if (colIndex === undefined || colIndex === -1) {
        if (column.required) {
          errors.push({ row: rowNum, column: column.header, message: 'Kötelező oszlop nincs hozzárendelve' });
          hasError = true;
        }
        continue;
      }
      
      let value = row[colIndex];
      
      // Handle empty required fields
      if ((value === '' || value === null || value === undefined) && column.required) {
        errors.push({ row: rowNum, column: column.header, message: 'Kötelező mező üres' });
        hasError = true;
        continue;
      }
      
      // Type conversion
      if (value !== '' && value !== null && value !== undefined) {
        switch (column.type) {
          case 'number':
            const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
            if (isNaN(num)) {
              errors.push({ row: rowNum, column: column.header, message: 'Érvénytelen szám formátum' });
              hasError = true;
            } else {
              value = num;
            }
            break;
          case 'date':
            if (typeof value === 'number') {
              // Excel date serial number
              value = new Date((value - 25569) * 86400 * 1000).toISOString().split('T')[0];
            } else if (typeof value === 'string') {
              const parsed = new Date(value);
              if (isNaN(parsed.getTime())) {
                errors.push({ row: rowNum, column: column.header, message: 'Érvénytelen dátum formátum' });
                hasError = true;
              } else {
                value = parsed.toISOString().split('T')[0];
              }
            }
            break;
          case 'boolean':
            value = ['igen', 'yes', 'true', '1', 'i', 'y'].includes(String(value).toLowerCase());
            break;
          default:
            value = String(value).trim();
        }
      }
      
      // Custom validation
      if (!hasError && column.validate && value !== '' && value !== null) {
        const validationResult = column.validate(value);
        if (typeof validationResult === 'string') {
          errors.push({ row: rowNum, column: column.header, message: validationResult });
          hasError = true;
        } else if (validationResult === false) {
          errors.push({ row: rowNum, column: column.header, message: 'Érvénytelen érték' });
          hasError = true;
        }
      }
      
      rowData[column.key] = value === '' ? null : value;
    }
    
    if (!hasError) {
      data.push(rowData);
    }
  }
  
  return {
    success: errors.length === 0,
    data,
    errors,
    warnings,
  };
};

// Partner import configuration
export const partnerImportConfig: ImportConfig = {
  columns: [
    { key: 'name', header: 'Név', required: true, type: 'string' },
    { key: 'tax_id', header: 'Adószám', required: false, type: 'string' },
    { key: 'email', header: 'Email', required: false, type: 'string' },
    { key: 'phone', header: 'Telefon', required: false, type: 'string' },
    { key: 'category', header: 'Kategória', required: false, type: 'string' },
    { key: 'default_currency', header: 'Pénznem', required: false, type: 'string' },
    { key: 'eu_vat_number', header: 'EU ÁFA szám', required: false, type: 'string' },
    { key: 'notes', header: 'Megjegyzés', required: false, type: 'string' },
  ],
  skipHeaderRow: true,
};

// Project import configuration
export const projectImportConfig: ImportConfig = {
  columns: [
    { key: 'name', header: 'Név', required: true, type: 'string' },
    { key: 'code', header: 'Kód', required: false, type: 'string' },
    { key: 'description', header: 'Leírás', required: false, type: 'string' },
    { key: 'status', header: 'Státusz', required: false, type: 'string' },
  ],
  skipHeaderRow: true,
};

// Sales import configuration
export const salesImportConfig: ImportConfig = {
  columns: [
    { key: 'name', header: 'Név', required: true, type: 'string' },
    { key: 'description', header: 'Leírás', required: false, type: 'string' },
    { key: 'status', header: 'Státusz', required: false, type: 'string' },
    { key: 'expected_value', header: 'Várható érték', required: false, type: 'number' },
    { key: 'currency', header: 'Pénznem', required: false, type: 'string' },
    { key: 'expected_close_date', header: 'Várható zárás', required: false, type: 'date' },
    { key: 'business_unit', header: 'Üzletág', required: false, type: 'string' },
  ],
  skipHeaderRow: true,
};

// Generate template file for download
export const generateImportTemplate = (config: ImportConfig, filename: string) => {
  const headers = config.columns.map(col => col.header);
  const exampleRow = config.columns.map(col => {
    if (col.required) return `(kötelező)`;
    return '';
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  worksheet['!cols'] = config.columns.map(() => ({ wch: 15 }));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import');
  XLSX.writeFile(workbook, `${filename}-sablon.xlsx`);
};
