import type { EvidenceLevel, IndicatorResult } from "./catalog";

export const EVIDENCE_WEIGHTS: Record<EvidenceLevel, number> = { E1:1, E2:.8, E3:.6, E4:.4, E5:.2 };

export function calculateRate(before: number, after: number): number | null {
  if (!Number.isFinite(before) || !Number.isFinite(after) || before === 0) return null;
  return ((before - after) / before) * 100;
}

export function calculateTransparencyRate(before: number, after: number): number | null {
  if (!Number.isFinite(before) || !Number.isFinite(after) || before === 0) return null;
  return ((after - before) / before) * 100;
}

export function weightedRollup(results: IndicatorResult[]) {
  const usable = results.filter((item) => item.status === "可用" && item.isPrimary && item.value !== null);
  const weightSum = usable.reduce((sum, item) => sum + item.evidenceWeight, 0);
  const weightedValue = weightSum === 0 ? null : usable.reduce((sum, item) => sum + (item.value as number) * item.evidenceWeight, 0) / weightSum;
  return { value: weightedValue, count: usable.length, weightSum };
}

export function technologyRollups(results: IndicatorResult[]) {
  const keys = new Set(results.map((item) => `${item.indicatorCode}|${item.pollutant ?? ""}|${item.unit}`));
  return [...keys].map((key) => {
    const [indicatorCode, pollutant, unit] = key.split("|");
    const group = results.filter((item) => `${item.indicatorCode}|${item.pollutant ?? ""}|${item.unit}` === key);
    return { indicatorCode, pollutant: pollutant || undefined, unit, ...weightedRollup(group) };
  });
}

export function completeness(results: IndicatorResult[]) {
  const available = new Set(results.filter((item) => item.status === "可用" && item.isPrimary && item.value !== null).map((item) => item.indicatorCode)).size;
  return { available, applicable: 11, rate: available / 11 };
}
