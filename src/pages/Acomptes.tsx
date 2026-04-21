import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getWorkers, getAcomptes, createAcompte, deleteAcompte } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2, Eye, Filter } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(n);
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Acomptes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [workerId, setWorkerId] = useState("");
  const [type, setType] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [filterType, setFilterType] = useState<"all" | "add" | "subtract">("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { data: workers } = useQuery({ queryKey: ["workers"], queryFn: getWorkers });
  const { data: txs, isLoading } = useQuery({ queryKey: ["acomptes"], queryFn: () => getAcomptes() });

  const selectedWorker = workers?.find((w) => w.id === workerId);
  const currentBalance = Number((selectedWorker as any)?.current_balance ?? 0);

  const createMut = useMutation({
    mutationFn: () => createAcompte({
      worker_id: workerId,
      type,
      amount: parseFloat(amount),
      transaction_date: date,
      note: note.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acomptes"] });
      qc.invalidateQueries({ queryKey: ["workers"] });
      qc.invalidateQueries({ queryKey: ["worker", workerId] });
      qc.invalidateQueries({ queryKey: ["worker-acomptes", workerId] });
      toast.success("Acompte enregistré");
      setOpen(false);
      setWorkerId(""); setAmount(""); setNote(""); setType("add"); setDate(todayStr());
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'enregistrement"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAcompte(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acomptes"] });
      qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Acompte supprimé");
    },
  });

  const handleSubmit = () => {
    if (!workerId) return toast.error("Sélectionnez un employé");
    const a = parseFloat(amount);
    if (!a || a <= 0) return toast.error("Le montant doit être positif");
    if (type === "subtract" && a > currentBalance) return toast.error(`Remboursement supérieur au solde (${fmt(currentBalance)} DA)`);
    createMut.mutate();
  };

  const filtered = useMemo(() => {
    if (!txs) return [];
    return txs.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterFrom && t.transaction_date < filterFrom) return false;
      if (filterTo && t.transaction_date > filterTo) return false;
      return true;
    });
  }, [txs, filterType, filterFrom, filterTo]);

  const totalDebt = useMemo(
    () => (workers ?? []).reduce((s, w) => s + Number((w as any).current_balance ?? 0), 0),
    [workers]
  );
  const topDebtors = useMemo(
    () => [...(workers ?? [])].sort((a, b) => Number((b as any).current_balance ?? 0) - Number((a as any).current_balance ?? 0)).filter(w => Number((w as any).current_balance ?? 0) > 0).slice(0, 3),
    [workers]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Acomptes</h1>
          <p className="text-muted-foreground mt-1">Gestion des avances sur salaire</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvel acompte</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Nouvel acompte</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Employé *</Label>
                <Select value={workerId} onValueChange={setWorkerId}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                  <SelectContent>
                    {workers?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.full_name} {w.matricule ? `(#${w.matricule})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedWorker && (
                  <p className="text-sm mt-2 text-muted-foreground">Solde actuel : <span className="font-semibold text-foreground">{fmt(currentBalance)} DA</span></p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Type *</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Avance (+)</SelectItem>
                      <SelectItem value="subtract">Remboursement (−)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Montant (DA) *</Label>
                  <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11" placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Note</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Description optionnelle..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={createMut.isPending}>{createMut.isPending ? "..." : "Enregistrer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><Wallet className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total dettes</p>
              <p className="text-2xl font-bold">{fmt(totalDebt)} DA</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-5 md:col-span-2">
          <p className="text-xs text-muted-foreground uppercase mb-2">Top débiteurs</p>
          {topDebtors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun</p>
          ) : (
            <div className="space-y-1.5">
              {topDebtors.map((w) => (
                <div key={w.id} className="flex justify-between text-sm">
                  <Link to={`/workers/${w.id}`} className="hover:underline">{w.full_name}</Link>
                  <span className="font-semibold">{fmt(Number((w as any).current_balance))} DA</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-xl p-4 flex flex-wrap items-end gap-3">
        <Filter className="w-4 h-4 text-muted-foreground mb-2.5" />
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="add">Avances</SelectItem>
              <SelectItem value="subtract">Remboursements</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Du</Label>
          <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-9 w-[150px]" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Au</Label>
          <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-9 w-[150px]" />
        </div>
      </div>

      {/* History */}
      <div className="bg-card border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Employé</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium text-right">Montant</th>
              <th className="p-4 font-medium text-right">Avant</th>
              <th className="p-4 font-medium text-right">Après</th>
              <th className="p-4 font-medium">Note</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Aucun acompte</td></tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 text-sm">{new Date(t.transaction_date).toLocaleDateString("fr-FR")}</td>
                  <td className="p-4 font-medium">{(t as any).workers?.full_name ?? "—"}</td>
                  <td className="p-4">
                    {t.type === "add" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><TrendingUp className="w-3 h-3" />Avance</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full"><TrendingDown className="w-3 h-3" />Remb.</span>
                    )}
                  </td>
                  <td className="p-4 text-right font-semibold">{fmt(Number(t.amount))} DA</td>
                  <td className="p-4 text-right text-sm text-muted-foreground">{fmt(Number(t.previous_balance))}</td>
                  <td className="p-4 text-right text-sm font-medium">{fmt(Number(t.new_balance))}</td>
                  <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate">{t.note ?? "—"}</td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <Link to={`/acomptes/${t.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("Supprimer cet acompte ?")) delMut.mutate(t.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
