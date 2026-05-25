import { formatDateFR } from "@/lib/date-utils";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocuments, deleteDocument, DOCUMENT_TYPES } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Trash2, CheckCircle2, Clock, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ValidateDocumentDialog from "@/components/ValidateDocumentDialog";

function StatusBadge({ status }: { status?: string }) {
  if (status === "VALIDATED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-950/40 dark:text-green-300 px-2 py-1 rounded-full">
        <CheckCircle2 className="w-3.5 h-3.5" /> Validé
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full">
        <XCircle className="w-3.5 h-3.5" /> Rejeté
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-1 rounded-full">
      <Clock className="w-3.5 h-3.5" /> En attente
    </span>
  );
}

export default function Documents() {
  const queryClient = useQueryClient();
  const { role, isAdmin } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [validateDoc, setValidateDoc] = useState<any | null>(null);
  const { data: documents, isLoading } = useQuery({ queryKey: ["documents"], queryFn: getDocuments });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document supprimé");
    },
  });

  const filtered = documents?.filter((doc: any) => {
    if (typeFilter !== "all" && doc.document_type !== typeFilter) return false;
    if (statusFilter !== "all" && (doc.status ?? "PENDING") !== statusFilter) return false;
    return true;
  });

  const canValidate = (doc: any) => {
    const status = doc.status ?? "PENDING";
    if (status !== "PENDING") return false;
    if (isAdmin() || role === "RH") return true;
    const dept = doc.workers?.department;
    return !!dept && dept === role;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">Tous les documents générés</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="VALIDATED">Validé</SelectItem>
              <SelectItem value="REJECTED">Rejeté</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : filtered && filtered.length > 0 ? (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Titre</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Employé</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc: any) => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{doc.title}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES]?.label}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {doc.workers?.full_name ?? "—"}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={doc.status} />
                    {doc.status === "REJECTED" && doc.rejection_reason && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[220px] truncate" title={doc.rejection_reason}>
                        {doc.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatDateFR(doc.created_at)}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    {canValidate(doc) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-1"
                        onClick={() => setValidateDoc(doc)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Valider / Rejeter
                      </Button>
                    )}
                    <Link to={`/documents/${doc.id}`}>
                      <Button variant="ghost" size="sm">Voir</Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Aucun document {typeFilter !== "all" ? "de ce type" : "créé"}</p>
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
