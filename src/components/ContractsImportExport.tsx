import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkers, getDocuments, createDocument, DOCUMENT_TYPES } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const CONTRACT_HEADERS = [
  { key: "matricule", label: "Matricule" },
  { key: "full_name", label: "Nom Complet" },
  { key: "num_contrat", label: "N° Contrat" },
  { key: "date_debut", label: "Date Début" },
  { key: "duree_mois", label: "Durée (mois)" },
  { key: "date_fin", label: "Date Fin" },
  { key: "date_sign", label: "Date Signature" },
  { key: "lieu_sign", label: "Lieu Signature" },
  { key: "periode_essai", label: "Période d'essai (Oui/Non)" },
  { key: "poste", label: "Poste" },
  { key: "date_nais", label: "Date Naissance" },
  { key: "lieu_nais", label: "Lieu Naissance" },
  { key: "wilaya_nais", label: "Wilaya Naissance" },
  { key: "cni", label: "N° CNI" },
  { key: "date_cni", label: "Date CNI" },
  { key: "wilaya_cni", label: "Wilaya CNI" },
  { key: "commune_cni", label: "Commune CNI" },
  { key: "adresse", label: "Adresse" },
  { key: "wilaya_adr", label: "Wilaya Adresse" },
  { key: "date_res", label: "Date Cert. Résidence" },
  { key: "tel", label: "Téléphone" },
  { key: "email", label: "Email" },
  { key: "sal_base", label: "Salaire Base" },
  { key: "sal_net", label: "Salaire Net" },
];

function parseExcelDate(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
    return null;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (dmy) {
      let [, d, m, y] = dmy;
      let year = parseInt(y, 10);
      if (year < 100) year += 2000;
      return `${year}-${pad(parseInt(m, 10))}-${pad(parseInt(d, 10))}`;
    }
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) return `${iso[1]}-${pad(parseInt(iso[2], 10))}-${pad(parseInt(iso[3], 10))}`;
    return null;
  }
  return null;
}

export default function ContractsImportExport() {
  const queryClient = useQueryClient();
  const { data: workers } = useQuery({ queryKey: ["workers"], queryFn: getWorkers });
  const { data: documents } = useQuery({ queryKey: ["documents"], queryFn: getDocuments });
  const [importOpen, setImportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<Array<{ worker_id: string; full_name: string; content: Record<string, any> }>>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const handleExport = () => {
    const contracts = (documents || []).filter((d) => d.document_type === "contract");
    if (contracts.length === 0) {
      toast.error("Aucun contrat à exporter");
      return;
    }
    const rows = contracts.map((doc) => {
      const c: any = doc.content || {};
      const w: any = c.worker || (doc as any).workers || {};
      const row: Record<string, any> = {};
      CONTRACT_HEADERS.forEach((h) => {
        if (h.key === "matricule") row[h.label] = w.matricule ?? "";
        else if (h.key === "full_name") row[h.label] = w.full_name ?? "";
        else if (h.key === "periode_essai") row[h.label] = c.periode_essai === "false" ? "Non" : "Oui";
        else row[h.label] = c[h.key] ?? "";
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows, { header: CONTRACT_HEADERS.map((h) => h.label) });
    ws["!cols"] = CONTRACT_HEADERS.map((h) => ({ wch: Math.max(h.label.length + 4, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contrats");
    XLSX.writeFile(wb, `contrats_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${contracts.length} contrat(s) exporté(s)`);
  };

  const downloadTemplate = () => {
    const headers = CONTRACT_HEADERS.map((h) => h.label);
    const sample = [
      "EMP-001", "Ahmed Benali", "001/2025", "2025-01-15", "12", "2026-01-14",
      "2025-01-15", "أولاد موسى", "Oui", "Technicien",
      "1990-05-20", "Alger", "الجزائر", "123456789", "2015-03-10", "الجزائر", "Hussein Dey",
      "123 Rue X", "الجزائر", "2024-06-01", "0612345678", "ahmed@example.com",
      "40000", "35000",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contrats");
    XLSX.writeFile(wb, "modele_import_contrats.xlsx");
  };

  const reset = () => {
    setParsedRows([]);
    setErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const findWorker = (matricule: string, fullName: string) => {
    if (!workers) return null;
    const mat = matricule?.toString().trim().toLowerCase();
    const name = fullName?.toString().trim().toLowerCase();
    if (mat) {
      const byMat = workers.find((w) => (w.matricule || "").toLowerCase() === mat);
      if (byMat) return byMat;
    }
    if (name) {
      return workers.find((w) => (w.full_name || "").toLowerCase() === name) || null;
    }
    return null;
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
        const ok: Array<{ worker_id: string; full_name: string; content: Record<string, any> }> = [];
        rows.forEach((row, i) => {
          const matricule = row["Matricule"]?.toString() || "";
          const fullName = row["Nom Complet"]?.toString() || "";
          if (!matricule && !fullName) {
            errs.push(`Ligne ${i + 2}: Matricule ou Nom Complet requis`);
            return;
          }
          const worker = findWorker(matricule, fullName);
          if (!worker) {
            errs.push(`Ligne ${i + 2}: Employé introuvable (${matricule || fullName})`);
            return;
          }
          const content: Record<string, any> = { worker };
          CONTRACT_HEADERS.forEach((h) => {
            if (h.key === "matricule" || h.key === "full_name") return;
            const val = row[h.label];
            if (val === undefined || val === null || val === "") return;
            if (h.key.startsWith("date_")) {
              const d = parseExcelDate(val);
              if (d) content[h.key] = d;
            } else if (h.key === "periode_essai") {
              const s = val.toString().toLowerCase();
              content[h.key] = ["non", "no", "false", "0"].includes(s) ? "false" : "true";
            } else {
              content[h.key] = val.toString();
            }
          });
          ok.push({ worker_id: worker.id, full_name: worker.full_name, content });
        });
        setParsedRows(ok);
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
    for (const r of parsedRows) {
      try {
        await createDocument({
          worker_id: r.worker_id,
          document_type: "contract",
          title: `${DOCUMENT_TYPES.contract.label} - ${r.full_name}`,
          content: r.content as any,
        });
        success++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setResult({ success, failed });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    if (success > 0) toast.success(`${success} contrat(s) importé(s)`);
    if (failed > 0) toast.error(`${failed} contrat(s) non importé(s)`);
  };

  return (
    <>
      <Button variant="outline" onClick={handleExport} className="gap-2">
        <Download className="w-4 h-4" /> Exporter contrats
      </Button>
      <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
        <Upload className="w-4 h-4" /> Importer contrats
      </Button>

      <Dialog open={importOpen} onOpenChange={(v) => { if (!v) reset(); setImportOpen(v); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Importer des contrats
            </DialogTitle>
            <DialogDescription>
              Importez plusieurs contrats depuis un fichier Excel. Les employés doivent déjà exister (recherche par matricule ou nom complet).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />
              Télécharger le modèle Excel
            </Button>

            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Sélectionnez votre fichier Excel</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="w-full text-sm" />
            </div>

            {parsedRows.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  {parsedRows.length} contrat(s) prêt(s) à importer
                </p>
              </div>
            )}

            {errors.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive space-y-0.5 max-h-40 overflow-auto">
                {errors.slice(0, 10).map((e, i) => (
                  <p key={i} className="flex items-center gap-1"><XCircle className="w-3 h-3" />{e}</p>
                ))}
                {errors.length > 10 && <p className="text-xs">...et {errors.length - 10} autre(s)</p>}
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
            <Button variant="outline" onClick={() => setImportOpen(false)}>Fermer</Button>
            <Button onClick={handleImport} disabled={parsedRows.length === 0 || importing || !!result}>
              {importing ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Importation...</>) : `Importer ${parsedRows.length} contrat(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
