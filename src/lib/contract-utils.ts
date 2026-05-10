export const CONTRACT_DURATIONS = [
  { value: "1_mois", label: "1 mois", months: 1 },
  { value: "3_mois", label: "3 mois", months: 3 },
  { value: "6_mois", label: "6 mois", months: 6 },
  { value: "1_an", label: "1 an", months: 12 },
  { value: "2_ans", label: "2 ans", months: 24 },
] as const;

export type ContractDurationValue = typeof CONTRACT_DURATIONS[number]["value"];

export function durationLabel(value?: string | null) {
  return CONTRACT_DURATIONS.find((d) => d.value === value)?.label ?? "—";
}

export function computeEndDate(start: string, duration: string): string {
  const monthsAdd = CONTRACT_DURATIONS.find((d) => d.value === duration)?.months ?? 0;
  if (!start || !monthsAdd) return "";
  const d = new Date(start);
  d.setMonth(d.getMonth() + monthsAdd);
  // Subtract one day so a "1 month" contract starting Jan 1 ends Jan 31
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type ContractStatus =
  | { kind: "none" }
  | { kind: "active"; endDate: string; daysLeft: number }
  | { kind: "expiring"; endDate: string; daysLeft: number }
  | { kind: "expired"; endDate: string; daysOver: number };

export function getContractStatus(endDateStr?: string | null): ContractStatus {
  if (!endDateStr) return { kind: "none" };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr); end.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { kind: "expired", endDate: endDateStr, daysOver: -diffDays };
  if (diffDays <= 30) return { kind: "expiring", endDate: endDateStr, daysLeft: diffDays };
  return { kind: "active", endDate: endDateStr, daysLeft: diffDays };
}

export function formatDateFR(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}
