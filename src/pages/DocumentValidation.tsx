import { formatDateFR } from "@/lib/date-utils";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDocuments, DOCUMENT_TYPES } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { CheckCircle2, Clock, XCircle, Download, ShieldCheck, FileText } from "lucide-react";
import ValidateDocumentDialog from "@/components/ValidateDocumentDialog";
import { useAuth } from "@/contexts/AuthContext";
import Forbidden from "@/pages/Forbidden";

function StatusBadge({ status }: { status?: string }) {
  if (status === "VALIDATED") return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-950/40 dark:text-green-300 px-2 py-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /> Validé</span>;
  if (status === "REJECTED") return <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full"><XCircle className="w-3.5 h-3.5" /> Rejeté</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-1 rounded-full"><Clock className="w-3.5 h-3.5" /> En attente</span>;
}

export default function DocumentValidation() {
  const { role, isAdmin } = useAuth();
  if (!isAdmin() && role !== "RH") return <Forbidden />;
  const { data: documents, isLoading } = useQuery({ queryKey: ["documents-validation"], queryFn: getDocuments });
  const [validateDoc, setValidateDoc] = useState<any | null>(null);

  const [deptFilter, setDeptFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const departments = useMemo(() => {
    const set = new Set<string>();
    (documents ?? []).forEach((d: any) => d.workers?.department && set.add(d.workers.department));
    return Array.from(set).sort();
  }, [documents]);

  const filtered = useMemo(() => {
    return (documents ?? []).filter((d: any) => {
      if (deptFilter !== "all" && d.workers?.department !== deptFilter) return false;
      if (typeFilter !== "all" && d.document_type !== typeFilter) return false;
      if (employeeSearch && !(d.workers?.full_name ?? "").toLowerCase().includes(employeeSearch.toLowerCase())) return false;
      if (fromDate && d.created_at < fromDate) return false;
      if (toDate && d.created_at > toDate + "T23:59:59") return false;
      return true;
    });
  }, [documents, deptFilter, typeFilter, employeeSearch, fromDate, toDate]);

  const stats = useMemo(() => {
    const all = documents ?? [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return {
      pending: all.filter((d: any) => (d.status ?? "PENDING") === "PENDING").length,
      validatedMonth: all.filter((d: any) => d.status === "VALIDATED" && d.validated_at && d.validated_at >= monthStart).length,
      rejectedMonth: all.filter((d: any) => d.status === "REJECTED" && d.validated_at && d.validated_at >= monthStart).length,
    };
  }, [documents]);

  const exportCSV = () => {
    const rows = [
      ["Employé", "Département", "Type", "Titre", "Statut", "Créé le", "Validé le", "Motif rejet"],
      ...filtered.map((d: any) => [
        d.workers?.full_name ?? "",
        d.workers?.department ?? "",
        DOCUMENT_TYPES[d.document_type as keyof typeof DOCUMENT_TYPES]?.label ?? d.document_type,
        d.title,
        d.status ?? "PENDING",
        formatDateFR(d.created_at),
        d.validated_at ? formatDateFR(d.validated_at) : "",
        (d.rejection_reason ?? "").replace(/[\r\n]+/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validation-documents-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Validation des documents</h1>
          <p className="text-muted-foreground mt-1">Tableau de bord RH — tous les départements</p>
        </div>
        <Button onClick={exportCSV} variant="outline"><Download className="w-4 h-4 mr-2" /> Exporter CSV</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300"><Clock className="w-4 h-4" /><span className="text-sm font-medium">En attente</span></div>
          <p className="text-3xl font-bold mt-2">{stats.pending}</p>
        </div>
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300"><CheckCircle2 className="w-4 h-4" /><span className="text-sm font-medium">Validés ce mois</span></div>
          <p className="text-3xl font-bold mt-2">{stats.validatedMonth}</p>
        </div>
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2 text-destructive"><XCircle className="w-4 h-4" /><span className="text-sm font-medium">Rejetés ce mois</span></div>
          <p className="text-3xl font-bold mt-2">{stats.rejectedMonth}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger><SelectValue placeholder="Département" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les départements</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(DOCUMENT_TYPES).map(([k, { label }]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Rechercher employé..." value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} />
        <DateInput value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="Du" />
        <DateInput value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="Au" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : filtered.length > 0 ? (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Employé</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Département</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Soumis le</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d: any) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-medium">{d.workers?.full_name ?? "—"}</td>
                  <td className="p-4 text-sm text-muted-foreground">{d.workers?.department ?? "—"}</td>
                  <td className="p-4 text-sm">{DOCUMENT_TYPES[d.document_type as keyof typeof DOCUMENT_TYPES]?.label ?? d.document_type}</td>
                  <td className="p-4 text-sm text-muted-foreground">{formatDateFR(d.created_at)}</td>
                  <td className="p-4"><StatusBadge status={d.status} /></td>
                  <td className="p-4 text-right">
                    {(d.status ?? "PENDING") === "PENDING" && (
                      <Button size="sm" variant="outline" onClick={() => setValidateDoc(d)}>
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Valider / Rejeter
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Aucun document trouvé</p>
        </div>
      )}

      {validateDoc && (
        <ValidateDocumentDialog
          open={!!validateDoc}
          onOpenChange={(o) => !o && setValidateDoc(null)}
          documentId={validateDoc.id}
          documentTitle={validateDoc.title}
          documentType={DOCUMENT_TYPES[validateDoc.document_type as keyof typeof DOCUMENT_TYPES]?.label ?? validateDoc.document_type}
          workerName={validateDoc.workers?.full_name ?? "—"}
        />
      )}
    </div>
  );
}
