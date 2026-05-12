import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMachineUnit(machineId: string): string {
  const cleanId = machineId.trim().toUpperCase();
  
  // TBR Check
  if (cleanId === '60T1' || cleanId === '60T2') return 'TBR 01';
  if (cleanId === '60T3' || cleanId === '60T4') return 'TBR 02';
  
  // Numerical Unit Check
  const numId = parseInt(cleanId);
  if (!isNaN(numId)) {
    if (numId >= 1 && numId <= 4) return 'UNIT 01';
    if (numId >= 5 && numId <= 8) return 'UNIT 02';
    if (numId >= 9 && numId <= 12) return 'UNIT 03';
    if (numId >= 13 && numId <= 16) return 'UNIT 04';
    if (numId >= 17 && numId <= 20) return 'UNIT 05';
    if (numId >= 21 && numId <= 24) return 'UNIT 06';
  }
  
  return 'OUTROS';
}

export interface ScheduleEntry {
  id: string;
  date: Date;
  machine: string;
  productCode: string;
  productPieceQty: number;
  material: string; // Item code
  materialClass: string;
  quantity: string;
  unit: string;
  note?: string;
}

export interface WeeklyPlan {
  id: string;
  uploadDate: Date;
  entries: ScheduleEntry[];
}
