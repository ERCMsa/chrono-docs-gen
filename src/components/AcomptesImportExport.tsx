import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkers, getAcomptes, createAcompte } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Download, FileJson, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Row = {
  worker_id: string;
  full_name: string;
  type: "add" | "subtract";
  amount: number;
  transaction_date: string;
  note?: string;
};

export default function AcomptesImportExport() {
  const qc = useQueryClient();
  const { data: workers } = useQuery({ queryKey: ["workers"], queryFn: getWorkers });
  const { data: txs } = useQuery({ queryKey: ["acomptes"], queryFn: () => getAcomptes() });
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const handleExport = () => {
    if (!txs || txs.length === 0) {
      toast.error("Aucun acompte à exporter");
      return;
    }
    const data = txs.map((t: any) => ({
      matricule: t.workers?.matricule ?? "",
      full_name: t.workers?.full_name ?? "",
      type: t.type,
      amount: Number(t.amount),
      transaction_date: t.transaction_date,
      previous_balance: Number(t.previous_balance),
      new_balance: Number(t.new_balance),
      note: t.note ?? "",
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acomptes_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${data.length} acompte(s) exporté(s)`);
  };

  const downloadTemplate = () => {
    const sample = [
      {
        matricule: "126",
        full_name: "BELAID HOCINE",
        type: "add",
        amount: 5000,
        transaction_date: new Date().toISOString().slice(0, 10),
        note: "Avance sur salaire",
      },
      {
        matricule: "",
        full_name: "BELAID HOCINE",
        type: "subtract",
        amount: 2000,
        transaction_date: new Date().toISOString().slice(0, 10),
        note: "Remboursement",
      },
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele_import_acomptes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setRows([]);
    setErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const findWorker = (matricule: string, fullName: string) => {
    if (!workers) return null;
    const m = (matricule || "").toString().trim().toLowerCase();
    if (m) {
      const w = workers.find((w) => (w.matricule || "").toLowerCase() === m);
      if (w) return w;
    }
    const n = (fullName || "").toString().trim().toLowerCase();
    if (n) {
      const w = workers.find((w) => (w.full_name || "").trim().toLowerCase() === n);
      if (w) return w;
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
        const ok: Row[] = [];
        arr.forEach((r, i) => {
          const matricule = r.matricule || "";
          const fullName = r.full_name || r.nom || "";
          const w = findWorker(matricule, fullName);
          if (!w) {
            errs.push(`Ligne ${i + 1}: employé introuvable (${matricule || fullName})`);
            return;
          }
          const type = (r.type === "subtract" ? "subtract" : "add") as "add" | "subtract";
          const amount = Number(r.amount);
          if (!amount || amount <= 0) {
            errs.push(`Ligne ${i + 1}: montant invalide`);
            return;
          }
          const date = (r.transaction_date || r.date || new Date().toISOString().slice(0, 10)).toString();
          ok.push({
            worker_id: w.id,
            full_name: w.full_name,
            type,
            amount,
            transaction_date: date,
            note: r.note || undefined,
          });
        });
        setRows(ok);
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
    for (const r of rows) {
      try {
        await createAcompte({
          worker_id: r.worker_id,
          type: r.type,
          amount: r.amount,
          transaction_date: r.transaction_date,
          note: r.note,
        });
        success++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setResult({ success, failed });
    qc.invalidateQueries({ queryKey: ["acomptes"] });
    qc.invalidateQueries({ queryKey: ["workers"] });
    if (success > 0) toast.success(`${success} acompte(s) importé(s)`);
    if (failed > 0) toast.error(`${failed} acompte(s) non importé(s)`);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <Upload className="w-4 h-4" /> Importer JSON
      </Button>
      <Button onClick={handleExport} variant="outline" className="gap-2">
        <Download className="w-4 h-4" /> Exporter JSON
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileJson className="w-5 h-5 text-primary" />
              Importer des acomptes (JSON)
            </DialogTitle>
            <DialogDescription>
              Importez plusieurs acomptes depuis un fichier JSON. Les employés doivent exister (recherche par matricule ou nom).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
              <Download className="w-4 h-4" /> Télécharger le modèle JSON
            </Button>

            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Sélectionnez votre fichier JSON</p>
              <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} className="w-full text-sm" />
            </div>

            {rows.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  {rows.length} acompte(s) prêt(s) à importer
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
            <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            <Button onClick={handleImport} disabled={rows.length === 0 || importing || !!result}>
              {importing ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Importation...</>) : `Importer ${rows.length} acompte(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
