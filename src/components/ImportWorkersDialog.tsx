import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWorker, type WorkerInsert } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const EXCEL_HEADERS = [
  { key: "matricule", label: "Matricule" },
  { key: "full_name", label: "Nom Complet" },
  { key: "date_naissance", label: "Date de Naissance" },
  { key: "lieu_naissance", label: "Lieu de Naissance" },
  { key: "sexe", label: "Sexe" },
  { key: "situation_familiale", label: "Situation Familiale" },
  { key: "address", label: "Adresse" },
  { key: "phone", label: "Téléphone" },
  { key: "position", label: "Fonction" },
  { key: "department", label: "Département" },
  { key: "hire_date", label: "Date de Recrutement" },
  { key: "numero_social", label: "Numéro Social" },
  { key: "numero_compte", label: "Numéro de Compte" },
  { key: "acte_naissance", label: "Acte de Naissance" },
  { key: "is_department_head", label: "Chef de Service (Oui/Non)" },
  { key: "date_demission", label: "Date de Démission" },
];

function parseExcelDate(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return `${date.y}-${pad(date.m)}-${pad(date.d)}`;
    return null;
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // DD/MM/YYYY or DD-MM-YYYY (also accepts 2-digit year)
    const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (dmy) {
      let [, d, m, y] = dmy;
      let year = parseInt(y, 10);
      if (year < 100) year += 2000;
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      const dt = new Date(Date.UTC(year, month - 1, day));
      if (dt.getUTCDate() !== day || dt.getUTCMonth() !== month - 1) return null;
      return `${year}-${pad(month)}-${pad(day)}`;
    }

    // YYYY-MM-DD
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      const y = parseInt(iso[1], 10), m = parseInt(iso[2], 10), d = parseInt(iso[3], 10);
      if (m < 1 || m > 12 || d < 1 || d > 31) return null;
      return `${y}-${pad(m)}-${pad(d)}`;
    }

    return null;
  }
  return null;
}

function rowToWorker(row: Record<string, any>): WorkerInsert {
  return {
    matricule: row["Matricule"]?.toString() || null,
    full_name: row["Nom Complet"]?.toString() || "",
    date_naissance: parseExcelDate(row["Date de Naissance"]),
    lieu_naissance: row["Lieu de Naissance"]?.toString() || null,
    sexe: row["Sexe"]?.toString() || null,
    situation_familiale: row["Situation Familiale"]?.toString() || null,
    address: row["Adresse"]?.toString() || null,
    phone: row["Téléphone"]?.toString() || null,
    position: row["Fonction"]?.toString() || null,
    department: row["Département"]?.toString() || null,
    hire_date: parseExcelDate(row["Date de Recrutement"]),
    numero_social: row["Numéro Social"]?.toString() || null,
    numero_compte: row["Numéro de Compte"]?.toString() || null,
    acte_naissance: row["Acte de Naissance"]?.toString() || null,
    is_department_head: ["oui", "yes", "true", "1"].includes(
      (row["Chef de Service (Oui/Non)"] || "").toString().toLowerCase()
    ),
    date_demission: parseExcelDate(row["Date de Démission"]),
  } as WorkerInsert;
}

export default function ImportWorkersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<WorkerInsert[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const reset = () => {
    setParsedRows([]);
    setErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);
        const errs: string[] = [];
        const workers: WorkerInsert[] = [];
        rows.forEach((row, i) => {
          if (!row["Nom Complet"]?.toString().trim()) {
            errs.push(`Ligne ${i + 2}: "Nom Complet" est vide`);
          } else {
            workers.push(rowToWorker(row));
          }
        });
        setParsedRows(workers);
        setErrors(errs);
      } catch {
        toast.error("Erreur de lecture du fichier Excel");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0, failed = 0;
    for (const w of parsedRows) {
      try {
        await createWorker(w);
        success++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setResult({ success, failed });
    queryClient.invalidateQueries({ queryKey: ["workers"] });
    if (success > 0) toast.success(`${success} employé(s) importé(s)`);
    if (failed > 0) toast.error(`${failed} employé(s) non importé(s)`);
  };

  const downloadTemplate = () => {
    const headers = EXCEL_HEADERS.map((h) => h.label);
    const ws = XLSX.utils.aoa_to_sheet([headers, [
      "EMP-001", "Ahmed Benali", "1990-05-15", "Alger", "Masculin", "Marié(e)",
      "123 Rue Example", "06 12 34 56 78", "Technicien", "Production",
      "2020-01-15", "123456789", "9876543210", "AB-1234", "Non", "",
    ]]);
    const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employés");
    XLSX.writeFile(wb, "modele_import_employes.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importer des employés
          </DialogTitle>
          <DialogDescription>
            Importez plusieurs employés depuis un fichier Excel (.xlsx, .xls)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
            <Download className="w-4 h-4" />
            Télécharger le modèle Excel
          </Button>

          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Glissez ou sélectionnez votre fichier Excel</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="w-full text-sm" />
          </div>

          {parsedRows.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {parsedRows.length} employé(s) prêt(s) à importer
              </p>
              {errors.length > 0 && (
                <div className="text-sm text-destructive space-y-0.5">
                  {errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="flex items-center gap-1"><XCircle className="w-3 h-3" />{e}</p>
                  ))}
                  {errors.length > 5 && <p className="text-xs">...et {errors.length - 5} autre(s)</p>}
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-lg border p-3 bg-muted/30 text-sm">
              <p className="text-green-600 font-medium">{result.success} importé(s) avec succès</p>
              {result.failed > 0 && <p className="text-destructive">{result.failed} échoué(s)</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={handleImport} disabled={parsedRows.length === 0 || importing || !!result}>
            {importing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importation...</> : `Importer ${parsedRows.length} employé(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
