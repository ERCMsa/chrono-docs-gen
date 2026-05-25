import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  documentType: string;
  workerName: string;
}

export default function ValidateDocumentDialog({ open, onOpenChange, documentId, documentTitle, documentType, workerName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"VALIDATED" | "REJECTED" | null>(null);
  const [reason, setReason] = useState("");

  const reset = () => { setMode(null); setReason(""); };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!mode) throw new Error("Choisissez une action");
      if (mode === "REJECTED" && !reason.trim()) throw new Error("Motif requis");
      const { error } = await (supabase as any)
        .from("documents")
        .update({
          status: mode,
          validated_by: user?.id ?? null,
          validated_at: new Date().toISOString(),
          rejection_reason: mode === "REJECTED" ? reason.trim() : null,
        })
        .eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents-validation"] });
      toast.success(mode === "VALIDATED" ? "Document validé" : "Document rejeté");
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Valider le document</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{workerName}</span> — {documentTitle}
            <span className="block text-xs mt-1 text-muted-foreground">{documentType}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant={mode === "VALIDATED" ? "default" : "outline"}
            onClick={() => setMode("VALIDATED")}
            className="h-16"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" /> Valider
          </Button>
          <Button
            type="button"
            variant={mode === "REJECTED" ? "destructive" : "outline"}
            onClick={() => setMode("REJECTED")}
            className="h-16"
          >
            <XCircle className="w-5 h-5 mr-2" /> Rejeter
          </Button>
        </div>

        {mode === "REJECTED" && (
          <div className="pt-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Motif du rejet *
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Expliquez la raison du rejet..."
              rows={4}
              required
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!mode || mutation.isPending || (mode === "REJECTED" && !reason.trim())}
          >
            {mutation.isPending ? "..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
