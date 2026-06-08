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
        cni: "414003017",
        nom: "عبوب جليلة",
        tel: "0558-13-65-84",
        email: "abboubdjalila@gmail.com",
        poste: "ingénieure génie civil",
        salNet: "51100",
        adresse: "السكن رقم 07 شارع فوزية مويلح الرستمية دالي ابراهيم",
        dateCni: "2025-01-10",
        dateFin: "2027-05-31",
        dateRes: "2026-05-18",
        salBase: "45000",
        dateNais: "2002-08-12",
        dateSign: "2026-06-01",
        lieuNais: "الآبيار",
        lieuSign: "أولاد موسى",
        dateDebut: "2026-06-01",
        dureeMois: 12,
        wilayaAdr: "الجزائر",
        wilayaCni: "الجزائر",
        communeCni: "دالي ابراهيم",
        numContrat: "73/2026",
        wilayaNais: "الجزائر",
        periodeEssai: "true",
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

  // Strip diacritics, spaces, punctuation, lowercase. Used for fuzzy Latin matching.
  const normLatin = (s: string) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  // Extract Latin tokens from an email local part: "abboubdjalila@x" -> "abboubdjalila"
  const emailLocal = (s: string) => normLatin((s || "").split("@")[0] || "");

  const findWorker = (matricule: string, fullName: string, cin: string, email: string) => {
    if (!workers) return null;
    const mat = matricule?.toString().trim().toLowerCase();
    const name = (fullName || "").toString().trim();
    const c = cin?.toString().trim().toLowerCase();

    if (mat) {
      const byMat = workers.find((w) => (w.matricule || "").toLowerCase() === mat);
      if (byMat) return byMat;
    }
    if (c) {
      const byCin = workers.find((w) => (w.cin || "").toLowerCase() === c);
      if (byCin) return byCin;
    }
    if (name) {
      const exact = workers.find((w) => (w.full_name || "").trim().toLowerCase() === name.toLowerCase());
      if (exact) return exact;
    }

    // Fuzzy match using the Latin email local against worker full names
    // (Arabic names in the file are paired with a Latin-based email like "abboubdjalila@..."
    // which usually mirrors the worker's French name "ABBOUB DJALILA").
    const eLocal = emailLocal(email);
    if (eLocal && eLocal.length >= 4) {
      // 1) Worker normalized full_name equals or contains the email local (or vice-versa)
      let best = workers.find((w) => {
        const wn = normLatin(w.full_name || "");
        if (!wn) return false;
        return wn === eLocal || wn.includes(eLocal) || eLocal.includes(wn);
      });
      if (best) return best;

      // 2) All tokens (split by capital letters or separators) appear in the email local
      best = workers.find((w) => {
        const tokens = (w.full_name || "")
          .split(/[\s\-_,.]+/)
          .map(normLatin)
          .filter((t) => t.length >= 3);
        if (tokens.length === 0) return false;
        return tokens.every((t) => eLocal.includes(t));
      });
      if (best) return best;
    }

    return null;
  };


  // Map camelCase legacy keys -> snake_case keys used by the app
  const CAMEL_TO_SNAKE: Record<string, string> = {
    numContrat: "num_contrat", dateDebut: "date_debut", dureeMois: "duree_mois",
    dateFin: "date_fin", dateSign: "date_sign", lieuSign: "lieu_sign",
    periodeEssai: "periode_essai", poste: "poste",
    dateNais: "date_nais", lieuNais: "lieu_nais", wilayaNais: "wilaya_nais",
    cni: "cni", dateCni: "date_cni", wilayaCni: "wilaya_cni", communeCni: "commune_cni",
    adresse: "adresse", wilayaAdr: "wilaya_adr", dateRes: "date_res",
    tel: "tel", email: "email", salBase: "sal_base", salNet: "sal_net",
  };

  const normalizeContent = (row: any): Record<string, any> => {
    // If row already has a content object, use it; otherwise treat row itself as the source
    const src = row.content && typeof row.content === "object" ? row.content : row;
    const content: Record<string, any> = {};
    Object.keys(src).forEach((k) => {
      if (["nom", "displayName", "id", "timestamp", "logoDataUrl", "avenant", "worker"].includes(k)) return;
      const mapped = CAMEL_TO_SNAKE[k] || k;
      let val = src[k];
      if (mapped === "periode_essai") {
        const s = String(val).toLowerCase();
        val = ["false", "non", "no", "0"].includes(s) ? "false" : "true";
      } else if (val !== null && val !== undefined) {
        val = typeof val === "string" ? val : String(val);
      }
      content[mapped] = val;
    });
    return content;
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
          const fullName = row.full_name || row.nom || row.displayName || row.content?.worker?.full_name || "";
          const cin = row.cni || row.cin || row.content?.worker?.cin || "";
          if (!matricule && !fullName && !cin) {
            errs.push(`Élément ${i + 1}: matricule, nom ou cni requis`);
            return;
          }
          const worker = findWorker(matricule, fullName, cin, row.email || row.content?.email || "");
          if (!worker) {
            errs.push(`Élément ${i + 1}: Employé introuvable (${matricule || cin || fullName})`);
            return;
          }
          const content = { ...normalizeContent(row), worker };
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
