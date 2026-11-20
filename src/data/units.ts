import type { UnitData } from '../types.ts';
import { UNITS_01_10 } from './units/units01_10.ts';
import { UNITS_11_20 } from './units/units11_20.ts';
import { UNITS_21_30 } from './units/units21_30.ts';
import { UNITS_31_40 } from './units/units31_40.ts';
import { UNITS_41_50 } from './units/units41_50.ts';
import { UNITS_51_60 } from './units/units51_60.ts';
import { UNITS_61_70 } from './units/units61_70.ts';
import { UNITS_71_80 } from './units/units71_80.ts';
import { UNITS_81_85 } from './units/units81_85.ts';
import { UNITS_86_90 } from './units/units86_90.ts';
import { UNITS_91_95 } from './units/units91_95.ts';
import { UNITS_96_100 } from './units/units96_100.ts';
import type { UnitProgressSummary } from '../utils/scoring.ts';

export const ALL_UNITS: UnitData[] = [
  ...UNITS_01_10,
  ...UNITS_11_20,
  ...UNITS_21_30,
  ...UNITS_31_40,
  ...UNITS_41_50,
  ...UNITS_51_60,
  ...UNITS_61_70,
  ...UNITS_71_80,
  ...UNITS_81_85,
  ...UNITS_86_90,
  ...UNITS_91_95,
  ...UNITS_96_100,
].sort((a, b) => a.id - b.id);

export interface UnitRangeOption {
  id: string;
  label: string;
  min: number;
  max: number;
}

export const UNIT_RANGES: UnitRangeOption[] = [
  { id: 'all', label: 'Barchasi', min: 1, max: 100 },
  { id: '1-20', label: '1–20', min: 1, max: 20 },
  { id: '21-40', label: '21–40', min: 21, max: 40 },
  { id: '41-60', label: '41–60', min: 41, max: 60 },
  { id: '61-80', label: '61–80', min: 61, max: 80 },
  { id: '81-100', label: '81–100', min: 81, max: 100 },
];

export type UnitStatusFilter = 'all' | 'uncompleted' | 'completed';
export type UnitSortMode = 'unit_asc' | 'uncompleted_first' | 'lowest_score';

export function getUnitById(unitId: number): UnitData | undefined {
  return ALL_UNITS.find((u) => u.id === unitId);
}

export function filterAndSortUnits(params: {
  units?: readonly UnitData[];
  query: string;
  statusFilter: UnitStatusFilter;
  sortMode: UnitSortMode;
  rangeId: string;
  unitSummaryMap: Record<number, UnitProgressSummary>;
}): UnitData[] {
  const {
    units = ALL_UNITS,
    query,
    statusFilter,
    sortMode,
    rangeId,
    unitSummaryMap,
  } = params;

  const range = UNIT_RANGES.find((r) => r.id === rangeId) ?? UNIT_RANGES[0];
  const qNorm = query.trim().toLowerCase();

  const filtered = units.filter((unit) => {
    if (unit.id < range.min || unit.id > range.max) return false;

    const summary = unitSummaryMap[unit.id];
    const isCompleted = Boolean(summary);
    if (statusFilter === 'completed' && !isCompleted) return false;
    if (statusFilter === 'uncompleted' && isCompleted) return false;

    if (!qNorm) return true;

    const idStr = String(unit.id);
    const unitLabel = `unit ${unit.id}`;
    if (
      idStr === qNorm ||
      unitLabel.includes(qNorm) ||
      unit.title.toLowerCase().includes(qNorm) ||
      unit.uzbekTopic.toLowerCase().includes(qNorm) ||
      unit.category.toLowerCase().includes(qNorm)
    ) {
      return true;
    }

    return unit.keywords.some((kw) => kw.toLowerCase().includes(qNorm));
  });

  return filtered.slice().sort((a, b) => {
    const sumA = unitSummaryMap[a.id];
    const sumB = unitSummaryMap[b.id];

    if (sortMode === 'uncompleted_first') {
      const doneA = sumA ? 1 : 0;
      const doneB = sumB ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return a.id - b.id;
    }

    if (sortMode === 'lowest_score') {
      const pctA = sumA ? sumA.bestPercentage : -1;
      const pctB = sumB ? sumB.bestPercentage : -1;
      if (pctA !== pctB) return pctA - pctB;
      return a.id - b.id;
    }

    return a.id - b.id;
  });
}
