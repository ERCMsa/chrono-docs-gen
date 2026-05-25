export const MODULES = [
  { key: "employees", label: "Employés" },
  { key: "payroll", label: "Paie / Acomptes" },
  { key: "leave", label: "Congés / Absences" },
  { key: "attendance", label: "Présence" },
  { key: "documents", label: "Documents" },
  { key: "reports", label: "Rapports / Statistiques" },
  { key: "planning", label: "Planning" },
  { key: "equipment", label: "Équipement" },
  { key: "recruitment", label: "Recrutement" },
  { key: "training", label: "Formation" },
  { key: "announcements", label: "Annonces" },
  { key: "settings", label: "Paramètres" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
export type PermissionAction = "view" | "create" | "edit" | "delete";

export const ROLES = [
  "ADMIN","PRODUCTION","ENGINEER","MAINTENANCE","GDS","MONTAGE",
  "IT","GENIE_CIVIL","RH","FINANCE","CLIENT","HSE",
  "CNC","VISITEUR","UNITE_ONE","UNITE_TWO",
] as const;
export type UserRole = (typeof ROLES)[number];
