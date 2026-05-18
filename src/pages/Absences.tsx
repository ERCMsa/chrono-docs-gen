import { DateInput } from "@/components/ui/date-input";
import { formatDateFR } from "@/lib/date-utils";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getWorkers, getAbsences, createAbsence, updateAbsence, deleteAbsence, type AbsenceWithWorker } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, CalendarX, Trash2, Pencil, Filter } from "lucide-react";
import { toast } from "sonner";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Absences() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AbsenceWithWorker | null>(null);
  const [workerId, setWorkerId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [filterWorker, setFilterWorker] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { data: workers } = useQuery({ queryKey: ["workers"], queryFn: getWorkers });
  const { data: absences, isLoading } = useQuery({ queryKey: ["absences"], queryFn: () => getAbsences() });

  const reset = () => {
    setEditing(null); setWorkerId(""); setDate(todayStr()); setReason("");
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (a: AbsenceWithWorker) => {
    setEditing(a); setWorkerId(a.worker_id); setDate(a.absence_date); setReason(a.reason ?? ""); setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        return updateAbsence(editing.id, { absence_date: date, reason: reason.trim() || null });
      }
      return createAbsence({ worker_id: workerId, absence_date: date, reason: reason.trim() || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absences"] });
      qc.invalidateQueries({ queryKey: ["worker-absences"] });
      toast.success(editing ? "Absence mise à jour" : "Absence enregistrée");
      setOpen(false); reset();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAbsence(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absences"] });
      qc.invalidateQueries({ queryKey: ["worker-absences"] });
      toast.success("Absence supprimée");
    },
  });

  const handleSubmit = () => {
    if (!workerId) return toast.error("Sélectionnez un employé");
    if (!date) return toast.error("Date requise");
    saveMut.mutate();
  };

  const filtered = useMemo(() => {
    if (!absences) return [];
    return absences.filter((a) => {
      if (filterWorker !== "all" && a.worker_id !== filterWorker) return false;
      if (filterFrom && a.absence_date < filterFrom) return false;
      if (filterTo && a.absence_date > filterTo) return false;
      return true;
    });
  }, [absences, filterWorker, filterFrom, filterTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Absences</h1>
          <p className="text-muted-foreground mt-1">Gestion des absences journalières</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nouvelle absence</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{editing ? "Modifier l'absence" : "Nouvelle absence"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Employé *</Label>
                <Select value={workerId} onValueChange={setWorkerId} disabled={!!editing}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                  <SelectContent>
                    {workers?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.full_name} {w.matricule ? `(#${w.matricule})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date *</Label>
                <DateInput value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Motif</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison de l'absence..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={saveMut.isPending}>{saveMut.isPending ? "..." : "Enregistrer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-xl p-4 flex flex-wrap items-end gap-3">
        <Filter className="w-4 h-4 text-muted-foreground mb-2.5" />
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Employé</Label>
          <Select value={filterWorker} onValueChange={setFilterWorker}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {workers?.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Du</Label>
          <DateInput value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-9 w-[150px]" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Au</Label>
          <DateInput value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-9 w-[150px]" />
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          Total : <span className="font-semibold text-foreground">{filtered.length}</span>
        </div>
      </div>

      {/* List */}
      <div className="bg-card border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Employé</th>
              <th className="p-4 font-medium">Département</th>
              <th className="p-4 font-medium">Motif</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center">
                <CalendarX className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">Aucune absence</p>
              </td></tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 text-sm">{formatDateFR(a.absence_date)}</td>
                  <td className="p-4 font-medium">
                    <Link to={`/workers/${a.worker_id}`} className="hover:underline">{a.workers?.full_name ?? "—"}</Link>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{a.workers?.department ?? "—"}</td>
                  <td className="p-4 text-sm text-muted-foreground max-w-[300px] truncate">{a.reason ?? "—"}</td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("Supprimer cette absence ?")) delMut.mutate(a.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
