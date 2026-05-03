import * as XLSX from 'xlsx';
import { ScheduleEntry, getMachineUnit } from './utils';
import { format } from 'date-fns';

export function exportToExcel(entries: ScheduleEntry[]) {
  if (entries.length === 0) return;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Plano Geral (Detailed)
  const planoGeralData = entries.map(e => ({
    Data: format(e.date, 'yyyy-MM-dd'),
    Unidade: getMachineUnit(e.machine),
    Maquina: e.machine,
    'Código Produto (Size)': e.productCode,
    Material: e.material,
    'Classe Material': e.materialClass,
    Quantidade: parseFloat(e.quantity) || 0,
    Unidade_Medida: e.unit,
    Nota: e.note || ''
  }));
  const ws1 = XLSX.utils.json_to_sheet(planoGeralData);
  XLSX.utils.book_append_sheet(wb, ws1, "Plano Detalhado");

  // Sheet 2: Resumo por Máquina/Dia
  const machineDailyMap = new Map<string, number>();
  entries.forEach(e => {
    const key = `${format(e.date, 'yyyy-MM-dd')}|${e.machine}`;
    machineDailyMap.set(key, (machineDailyMap.get(key) || 0) + (parseFloat(e.quantity) || 0));
  });

  const machineDailyData = Array.from(machineDailyMap.entries()).map(([key, total]) => {
    const [date, machine] = key.split('|');
    return {
      Data: date,
      Unidade: getMachineUnit(machine),
      Maquina: machine,
      'Total Produzido (kg)': Math.round(total * 1000) / 1000
    };
  }).sort((a, b) => a.Data.localeCompare(b.Data) || a.Maquina.localeCompare(b.Maquina, undefined, { numeric: true }));

  const ws2 = XLSX.utils.json_to_sheet(machineDailyData);
  XLSX.utils.book_append_sheet(wb, ws2, "Resumo Diario Maquina");

  // Sheet 3: Resumo por Material/Dia
  const materialDailyMap = new Map<string, number>();
  entries.forEach(e => {
    const key = `${format(e.date, 'yyyy-MM-dd')}|${e.material}`;
    materialDailyMap.set(key, (materialDailyMap.get(key) || 0) + (parseFloat(e.quantity) || 0));
  });

  const materialDailyData = Array.from(materialDailyMap.entries()).map(([key, total]) => {
    const [date, material] = key.split('|');
    return {
      Data: date,
      Material: material,
      'Total Consumido (kg)': Math.round(total * 1000) / 1000
    };
  }).sort((a, b) => a.Data.localeCompare(b.Data) || a.Material.localeCompare(b.Material));

  const ws3 = XLSX.utils.json_to_sheet(materialDailyData);
  XLSX.utils.book_append_sheet(wb, ws3, "Resumo Diario Material");

  // Write file
  XLSX.writeFile(wb, `Planejamento_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}
