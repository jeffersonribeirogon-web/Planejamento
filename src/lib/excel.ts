import * as XLSX from 'xlsx';
import { ScheduleEntry } from './utils';

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
        let referenceYear = new Date().getFullYear();

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
          if (firstCell.includes('Building machine ID:')) {
            currentMachine = String(row[1] || '').trim();
            // Reset dates/codes until we find them for this block
            currentDates = [];
            currentProductCodes = [];
            continue;
          }

          // Action 2: Update current dates
          if (firstCell === 'Production Date') {
            currentDates = [];
            for (let col = 2; col <= 14; col += 2) {
              const dateVal = String(row[col] || '').trim().toLowerCase();
              if (dateVal) {
                const parts = dateVal.split('/');
                if (parts.length === 2) {
                  const day = parseInt(parts[0]);
                  const month = PORTUGUESE_MONTHS[parts[1]] ?? 0;
                  currentDates.push(new Date(referenceYear, month, day));
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
          if (firstCell === 'Product code') {
            currentProductCodes = [];
            for (let col = 2; col <= 14; col += 2) {
              currentProductCodes.push(String(row[col] || '').trim());
            }
            continue;
          }

          // Action 4: Skip other headers or empty starts
          if (!firstCell || ['Product qty', 'Item class', 'SRB - BUILDING', 'Unit ID:', 'Building machine ID:', 'Production Date', 'Product code'].some(h => firstCell.includes(h))) {
            continue;
          }

          // Action 5: Process data rows ONLY for Mixing Rubber(Final)
          if (firstCell !== 'Mixing Rubber(Final)') {
            continue;
          }

          const itemClass = firstCell;
          const unit = String(row[1] || '');
          
          for (let dayIdx = 0; dayIdx < currentDates.length; dayIdx++) {
            const dayDate = currentDates[dayIdx];
            if (!dayDate || dayDate.getTime() === 0) continue;

            const colIdx = 2 + (dayIdx * 2);
            const itemCode = String(row[colIdx] || '').trim();
            const itemQtyRaw = String(row[colIdx + 1] || '').trim();

            if (itemCode && itemCode !== '0' && !['null', 'undefined', ''].includes(itemCode.toLowerCase())) {
              let itemQty = 0;
              if (itemQtyRaw) {
                let sanitized = itemQtyRaw.replace(/\.(?=\d{3,}(?:\D|$))/g, '');
                sanitized = sanitized.replace(',', '.');
                itemQty = parseFloat(sanitized);
                if (isNaN(itemQty)) itemQty = 0;
              }

              entries.push({
                id: `entry-${i}-${dayIdx}-${Date.now()}`,
                date: dayDate,
                machine: currentMachine,
                productCode: currentProductCodes[dayIdx] || 'N/A',
                material: itemCode,
                materialClass: itemClass,
                quantity: itemQty.toString(),
                unit: unit
              });
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
