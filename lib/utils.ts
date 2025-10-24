import { type ClassValue, clsx } from 'clsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

export function formatDate(date: string | Date, formatStr: string = 'dd.MM.yyyy'): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Eğer tarih string'i 'Z' ile bitmiyorsa (UTC değilse), UTC olarak işle
    if (!date.endsWith('Z') && !date.includes('+') && !date.includes('T')) {
      dateObj = new Date(date + 'T00:00:00');
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  // Geçersiz tarih kontrolü
  if (isNaN(dateObj.getTime())) {
    return '-';
  }
  
  return format(dateObj, formatStr, { locale: tr });
}

export function formatNumber(number: number, decimals: number = 2): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Stock movement type labels
export const movementTypeLabels = {
  IN: 'Giriş',
  OUT: 'Çıkış',
};

// Customer type labels
export const customerTypeLabels = {
  customer: 'Müşteri',
  supplier: 'Tedarikçi',
  both: 'Müşteri/Tedarikçi',
};

// Check status labels
export const checkStatusLabels = {
  portfolio: 'Portföyde',
  collected: 'Tahsil Edildi',
  returned: 'İade/Karşılıksız',
  endorsed: 'Ciro Edildi',
  in_bank: 'Bankada',
  protested: 'Protesto Edildi',
};

// Check type labels
export const checkTypeLabels = {
  received: 'Alınan',
  issued: 'Verilen',
};

// Account movement type labels
export const accountMovementTypeLabels = {
  DEBT: 'Borç',
  CREDIT: 'Alacak',
};

// Export data to Excel
export async function exportToExcel(data: any[], filename: string) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Veri');
  
  // Add headers
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    
    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add data
    data.forEach(row => {
      worksheet.addRow(Object.values(row));
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
  }
  
  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}