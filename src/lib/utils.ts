import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ScheduleEntry {
  id: string;
  date: Date;
  machine: string;
  productCode: string;
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
