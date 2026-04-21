import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWorker } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { exportToPdf } from "@/lib/pdf-export";
import AcomptePreview from "@/components/AcomptePreview";

export default function AcompteView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tx, isLoading } = useQuery({
    queryKey: ["acompte", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("acompte_transactions").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: worker } = useQuery({
    queryKey: ["worker", tx?.worker_id],
    queryFn: () => getWorker(tx!.worker_id),
    enabled: !!tx?.worker_id,
  });

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>;
  if (!tx || !worker) return <p className="text-destructive">Acompte introuvable</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/acomptes")}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Imprimer</Button>
          <Button variant="outline" onClick={() => exportToPdf("document-preview", `Bon_Acompte_${worker.full_name}`)}><Download className="w-4 h-4 mr-2" />PDF</Button>
        </div>
      </div>
      <div id="document-preview">
        <AcomptePreview worker={worker} tx={tx} />
      </div>
    </div>
  );
}
