export const DUREE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];

export function dureeArabic(mois: number): string {
  const map: Record<number, string> = {
    1: "(01) شهر واحد",
    2: "(02) شهران",
    3: "(03) ثلاثة أشهر",
    4: "(04) أربعة أشهر",
    5: "(05) خمسة أشهر",
    6: "(06) ستة أشهر",
    7: "(07) سبعة أشهر",
    8: "(08) ثمانية أشهر",
    9: "(09) تسعة أشهر",
    10: "(10) عشرة أشهر",
    11: "(11) أحد عشر شهرا",
    12: "(12) اثنا عشر شهرا",
    18: "(18) ثمانية عشر شهرا",
    24: "(24) أربعة وعشرون شهرا",
  };
  return map[mois] ?? `(${mois}) شهرا`;
}

export function dureeArabicLabel(m: number): string {
  if (m === 1) return "شهر واحد";
  if (m === 2) return "شهران";
  if (m < 11) return `${m} أشهر`;
  if (m === 12) return "12 شهرا (سنة)";
  if (m === 24) return "24 شهرا (سنتين)";
  return `${m} شهرا`;
}

export function dureeFr(m: number): string {
  const map: Record<number, string> = {
    1: "un (01) mois",
    2: "deux (02) mois",
    3: "trois (03) mois",
    4: "quatre (04) mois",
    5: "cinq (05) mois",
    6: "six (06) mois",
    7: "sept (07) mois",
    8: "huit (08) mois",
    9: "neuf (09) mois",
    10: "dix (10) mois",
    11: "onze (11) mois",
    12: "douze (12) mois",
    18: "dix-huit (18) mois",
    24: "vingt-quatre (24) mois",
  };
  return map[m] ?? `(${m}) mois`;
}

export function computeContractEnd(start: string, mois: number): string {
  if (!start || !mois) return "";
  const d = new Date(start);
  d.setMonth(d.getMonth() + mois);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
