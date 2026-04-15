import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWorkers, createWorker, deleteWorker, type WorkerInsert } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Users, Search, Shield, Upload } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ImportWorkersDialog from "@/components/ImportWorkersDialog";

const emptyWorker: WorkerInsert = {
  full_name: "", phone: "", position: "", department: "", address: "", matricule: "",
};

export default function Workers() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<WorkerInsert>({ ...emptyWorker });
  const [isDeptHead, setIsDeptHead] = useState(false);
  const [search, setSearch] = useState("");

  const { data: workers, isLoading } = useQuery({ queryKey: ["workers"], queryFn: getWorkers });

  const createMutation = useMutation({
    mutationFn: () => createWorker({ ...form, is_department_head: isDeptHead }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setOpen(false);
      setForm({ ...emptyWorker });
      setIsDeptHead(false);
      toast.success("Employé ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Employé supprimé");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("Le nom est requis"); return; }
    createMutation.mutate();
  };

  const updateField = (key: keyof WorkerInsert, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const filtered = workers?.filter((w) => {
    const q = search.toLowerCase();
    return (
      w.full_name.toLowerCase().includes(q) ||
      (w.position ?? "").toLowerCase().includes(q) ||
      (w.department ?? "").toLowerCase().includes(q) ||
      (w.phone ?? "").toLowerCase().includes(q) ||
      (w.matricule ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employés</h1>
          <p className="text-muted-foreground mt-1">Gérez vos employés</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Nouvel employé</DialogTitle>
              <DialogDescription>Remplissez les informations du nouvel employé.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
              {/* Information Personnelle */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3">Information Personnelle</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Matricule</Label>
                    <Input value={(form.matricule as string) ?? ""} onChange={(e) => updateField("matricule", e.target.value)} placeholder="Ex: EMP-001" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Nom *</Label>
                    <Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} placeholder="Nom et prénom" className="h-11" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Adresse</Label>
                    <Input value={(form.address as string) ?? ""} onChange={(e) => updateField("address", e.target.value)} placeholder="Adresse complète" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date de Naissance</Label>
                    <Input type="date" value={(form as any).date_naissance ?? ""} onChange={(e) => updateField("date_naissance" as any, e.target.value)} className="h-11" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Lieu de Naissance</Label>
                    <Input value={(form as any).lieu_naissance ?? ""} onChange={(e) => updateField("lieu_naissance" as any, e.target.value)} placeholder="Ex: Casablanca" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Situation Familiale</Label>
                    <Select value={(form as any).situation_familiale ?? ""} onValueChange={(v) => updateField("situation_familiale" as any, v)}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Célibataire">Célibataire</SelectItem>
                        <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                        <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                        <SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Sexe</Label>
                    <Select value={(form as any).sexe ?? ""} onValueChange={(v) => updateField("sexe" as any, v)}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculin">Masculin</SelectItem>
                        <SelectItem value="Féminin">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Téléphone</Label>
                    <Input value={(form.phone as string) ?? ""} onChange={(e) => updateField("phone", e.target.value)} placeholder="Ex: 06 12 34 56 78" className="h-11" />
                  </div>
                </div>
              </div>

              {/* Information De Fonction */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3">Information De Fonction</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Fonction</Label>
                    <Input value={(form.position as string) ?? ""} onChange={(e) => updateField("position", e.target.value)} placeholder="Ex: Technicien" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Département</Label>
                    <Input value={(form.department as string) ?? ""} onChange={(e) => updateField("department", e.target.value)} placeholder="Ex: Production" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date de Recrutement</Label>
                    <Input type="date" value={(form as any).hire_date ?? ""} onChange={(e) => updateField("hire_date" as any, e.target.value)} className="h-11" />
                  </div>
                </div>
              </div>

              {/* Numero Identité */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3">Numéro Identité</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Numéro Social</Label>
                    <Input value={(form as any).numero_social ?? ""} onChange={(e) => updateField("numero_social" as any, e.target.value)} placeholder="0" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Numéro de Compte</Label>
                    <Input value={(form as any).numero_compte ?? ""} onChange={(e) => updateField("numero_compte" as any, e.target.value)} placeholder="0" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Acte de Naissance</Label>
                    <Input value={(form as any).acte_naissance ?? ""} onChange={(e) => updateField("acte_naissance" as any, e.target.value)} placeholder="Numéro" className="h-11" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <Switch checked={isDeptHead} onCheckedChange={setIsDeptHead} />
                <div>
                  <Label className="cursor-pointer font-medium">Responsable de département</Label>
                  <p className="text-xs text-muted-foreground">Cet employé est chef de service</p>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Ajout..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un employé (nom, poste, matricule...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((w) => (
            <Link key={w.id} to={`/workers/${w.id}`} className="block">
              <div className="bg-card border rounded-xl p-4 flex items-center justify-between hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {w.is_department_head ? (
                      <Shield className="w-5 h-5 text-primary" />
                    ) : (
                      <Users className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {w.full_name}
                      {w.is_department_head && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Chef de service</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[w.matricule ? `#${w.matricule}` : null, w.position, w.department].filter(Boolean).join(" • ") || "Aucun poste défini"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {w.phone && <span className="text-xs text-muted-foreground hidden sm:inline">{w.phone}</span>}
                  <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteMutation.mutate(w.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {search ? "Aucun employé trouvé" : "Aucun employé. Ajoutez votre premier employé."}
          </p>
        </div>
      )}
    </div>
  );
}
