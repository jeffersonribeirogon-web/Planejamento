import * as XLSX from 'xlsx';
import { ScheduleEntry } from './utils';
import { format } from 'date-fns';

const PORTUGUESE_MONTHS: Record<string, number> = {
  'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
  'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
};

export async function parseExcelFile(file: File): Promise<ScheduleEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const entries: ScheduleEntry[] = [];
        
        let currentMachine = '';
        let currentDates: Date[] = [];
        let currentProductCodes: string[] = [];
        let currentPieceQtys: number[] = [];
        let referenceYear = new Date().getFullYear();

        const parseBRValue = (val: any): number => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          const str = String(val).trim();
          if (!str || str === '0') return 0;
          
          // Handle BR format: 1.214,625 -> 1214.625
          if (str.includes('.') && str.includes(',')) {
            return parseFloat(str.replace(/\./g, '').replace(',', '.'));
          }
          // Handle format: 1214,625 -> 1214.625
          if (str.includes(',')) {
            return parseFloat(str.replace(',', '.'));
          }
          // Handle potential thousands separator as a single dot: 1.214 -> 1214 
          // (Only if it looks like thousands: exactly 3 digits after the dot)
          // But safer to just parseFloat for standard cases unless user confirms.
          // For now, standard parseFloat is safer for single dots unless highly likely to be thousands.
          return parseFloat(str);
        };

        // 1. Find reference year
        for (const row of rows) {
          const dateCell = row.find(c => String(c).includes('Date：'));
          if (dateCell) {
             const idx = row.indexOf(dateCell);
             const val = String(row[idx + 1] || '');
             const match = val.match(/\d{2}\/\d{2}\/(\d{4})/);
             if (match) referenceYear = parseInt(match[1]);
             break;
          }
        }

        // 2. Process rows
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const firstCell = String(row[0] || '').trim();

          // Action 1: Update current machine
          if (firstCell.toLowerCase().includes('building machine id:')) {
            // Normalize machine name: trim and remove leading zeros if it's just a number string
            let rawMachine = String(row[1] || '').trim();
            if (/^\d+$/.test(rawMachine)) {
              currentMachine = parseInt(rawMachine, 10).toString();
            } else {
              currentMachine = rawMachine;
            }
            
            // Reset dates/codes until we find them for this block
            currentDates = [];
            currentProductCodes = [];
            currentPieceQtys = [];
            continue;
          }

          // Action 2: Update current dates
          if (firstCell.toLowerCase().includes('production date')) {
            currentDates = [];
            for (let col = 2; col <= 14; col += 2) {
              const dateVal = String(row[col] || '').trim().toLowerCase();
              if (dateVal) {
                const parts = dateVal.split('/');
                if (parts.length === 2) {
                  const day = parseInt(parts[0]);
                  const month = PORTUGUESE_MONTHS[parts[1]] ?? 0;
                  currentDates.push(new Date(referenceYear, month, day));
                } else if (typeof row[col] === 'number') {
                  // Handle serial dates from Excel
                  const date = XLSX.SSF.parse_date_code(row[col]);
                  currentDates.push(new Date(date.y, date.m - 1, date.d));
                } else {
                  currentDates.push(new Date(0));
                }
              } else {
                currentDates.push(new Date(0));
              }
            }
            continue;
          }

          // Action 3: Update current product codes (Sizes)
          if (firstCell.toLowerCase().includes('product code')) {
            currentProductCodes = [];
            for (let col = 2; col <= 14; col += 2) {
              currentProductCodes.push(String(row[col] || '').trim());
            }
            continue;
          }

          // Action 3.1: Update current product quantities (Pieces)
          if (firstCell.toLowerCase().includes('product qty')) {
            currentPieceQtys = [];
            for (let col = 2; col <= 14; col += 2) {
              // Check column and column+1 as labels/values can shift
              const val = row[col] || row[col + 1];
              const qty = parseBRValue(val);
              currentPieceQtys.push(isNaN(qty) ? 0 : qty);
            }
            continue;
          }

          // Action 4: Skip other headers or empty starts
          const headersToSkip = [
            'product qty', 'item class', 'srb - building', 
            'unit id:', 'building machine id:', 'production date', 'product code'
          ];
          if (!firstCell || headersToSkip.some(h => firstCell.toLowerCase().includes(h))) {
            continue;
          }

          // Action 5: Process data rows
          if (!currentMachine || currentDates.length === 0) continue;

          const searchTerms = ['mixing rubber', 'borracha', 'composto', 'material'];
          const isRelevantRow = searchTerms.some(term => firstCell.toLowerCase().includes(term));
          
          if (!isRelevantRow) {
             continue;
          }

          const itemClass = firstCell;
          const unit = String(row[1] || 'kg');
          
          for (let dayIdx = 0; dayIdx < currentDates.length; dayIdx++) {
            const dayDate = currentDates[dayIdx];
            if (!dayDate || dayDate.getTime() === 0) continue;

            const colIdx = 2 + (dayIdx * 2);
            const itemCode = String(row[colIdx] || '').trim();

            if (itemCode && itemCode !== '0' && !['null', 'undefined', ''].includes(itemCode.toLowerCase())) {
              const rawVal = row[colIdx + 1];
              const itemQty = parseBRValue(rawVal);

              if (!isNaN(itemQty) && itemQty > 0) {
                const roundedQty = Math.round(itemQty * 10000) / 10000;
                
                entries.push({
                  id: `entry-${i}-${dayIdx}-${Date.now()}`,
                  date: dayDate,
                  dateString: format(dayDate, 'yyyy-MM-dd'),
                  machine: currentMachine,
                  productCode: currentProductCodes[dayIdx] || 'N/A',
                  productPieceQty: currentPieceQtys[dayIdx] || 0,
                  material: itemCode,
                  materialClass: itemClass,
                  quantity: roundedQty.toString(),
                  unit: unit
                });
              }
            }
          }
        }

        if (entries.length === 0) {
          throw new Error("Nenhum dado de material encontrado.");
        }
        resolve(entries);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
