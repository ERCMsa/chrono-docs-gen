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
  FileJson,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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
    const data = contracts.map((doc) => {
      const c: any = doc.content || {};
      const w: any = c.worker || (doc as any).workers || {};
      return {
        matricule: w.matricule ?? "",
        full_name: w.full_name ?? "",
        title: doc.title,
        created_at: doc.created_at,
        content: c,
      };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contrats_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${contracts.length} contrat(s) exporté(s)`);
  };

  const downloadTemplate = () => {
    const sample = [
      {
        matricule: "EMP-001",
        full_name: "Ahmed Benali",
        content: {
          num_contrat: "001/2025",
          date_debut: "2025-01-15",
          duree_mois: "12",
          date_fin: "2026-01-14",
          date_sign: "2025-01-15",
          lieu_sign: "أولاد موسى",
          periode_essai: "true",
          poste: "Technicien",
          date_nais: "1990-05-20",
          lieu_nais: "Alger",
          wilaya_nais: "الجزائر",
          cni: "123456789",
          date_cni: "2015-03-10",
          wilaya_cni: "الجزائر",
          commune_cni: "Hussein Dey",
          adresse: "123 Rue X",
          wilaya_adr: "الجزائر",
          date_res: "2024-06-01",
          tel: "0612345678",
          email: "ahmed@example.com",
          sal_base: "40000",
          sal_net: "35000",
        },
      },
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele_import_contrats.json";
    a.click();
    URL.revokeObjectURL(url);
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
        const text = String(evt.target?.result || "");
        const parsed = JSON.parse(text);
        const arr: any[] = Array.isArray(parsed) ? parsed : [parsed];
        const errs: string[] = [];
        const ok: Array<{ worker_id: string; full_name: string; content: Record<string, any> }> = [];
        arr.forEach((row, i) => {
          const matricule = row.matricule || row.content?.worker?.matricule || "";
          const fullName = row.full_name || row.content?.worker?.full_name || "";
          if (!matricule && !fullName) {
            errs.push(`Élément ${i + 1}: matricule ou full_name requis`);
            return;
          }
          const worker = findWorker(matricule, fullName);
          if (!worker) {
            errs.push(`Élément ${i + 1}: Employé introuvable (${matricule || fullName})`);
            return;
          }
          const content = { ...(row.content || {}), worker };
          ok.push({ worker_id: worker.id, full_name: worker.full_name, content });
        });
        setParsedRows(ok);
        setErrors(errs);
      } catch {
        toast.error("Fichier JSON invalide");
      }
    };
    reader.readAsText(file);
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
      <Button onClick={() => setImportOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
        استيراد (Importer) <Upload className="w-4 h-4" />
      </Button>
      <Button onClick={handleExport} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
        تصدير (Exporter) <Download className="w-4 h-4" />
      </Button>

      <Dialog open={importOpen} onOpenChange={(v) => { if (!v) reset(); setImportOpen(v); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileJson className="w-5 h-5 text-primary" />
              Importer des contrats (JSON)
            </DialogTitle>
            <DialogDescription>
              Importez plusieurs contrats depuis un fichier JSON. Les employés doivent déjà exister (recherche par matricule ou nom complet).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />
              Télécharger le modèle JSON
            </Button>

            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Sélectionnez votre fichier JSON</p>
              <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} className="w-full text-sm" />
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
