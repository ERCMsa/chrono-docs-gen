import logoErcm from "@/assets/logo-ercm.png";
import type { AcompteTransaction, Worker } from "@/lib/supabase-helpers";
import { formatDateFR } from "@/lib/date-utils";

interface Props {
  worker: Worker;
  tx: AcompteTransaction;
  variant?: "recu" | "decharge";
}

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(n);
const dt = (s: string) => formatDateFR(s);

const LABEL: Record<string, string> = {
  acompte: "Acompte",
  dette: "Dette",
  reglement: "Règlement",
};

export default function AcomptePreview({ worker, tx, variant }: Props) {
  const v: "recu" | "decharge" = variant || (tx.type === "reglement" ? "decharge" : "recu");
  const title = v === "decharge" ? "Décharge de Règlement" : "Bon d'Acompte";
  return (
    <div className="bg-white text-black mx-auto max-w-[800px] p-12 shadow-lg" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between border-b-2 border-primary pb-4 mb-8">
        <img src={logoErcm} alt="ERCM" className="h-16" />
        <div className="text-right">
          <h2 className="font-bold text-lg">ERCM SA</h2>
          <p className="text-xs text-gray-600">{title}</p>
        </div>
      </div>

      <h1 className="text-center text-2xl font-bold uppercase tracking-wider mb-8">
        {title} N° {tx.id.slice(0, 8).toUpperCase()}
      </h1>

      <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
        <div><span className="font-semibold">Date :</span> {dt(tx.transaction_date)}</div>
        <div><span className="font-semibold">Type d'opération :</span> {LABEL[tx.type] || tx.type}</div>
        <div className="col-span-2"><span className="font-semibold">Employé :</span> {worker.full_name}</div>
        {worker.matricule && <div><span className="font-semibold">Matricule :</span> {worker.matricule}</div>}
        {worker.position && <div><span className="font-semibold">Fonction :</span> {worker.position}</div>}
        {worker.department && <div className="col-span-2"><span className="font-semibold">Département :</span> {worker.department}</div>}
      </div>

      <table className="w-full border border-gray-400 mb-8 text-sm">
        <tbody>
          <tr>
            <td className="p-3 font-semibold bg-gray-100 w-1/2">Montant {LABEL[tx.type]?.toLowerCase()}</td>
            <td className="p-3 text-right font-bold text-primary text-lg">{fmt(Number(tx.amount))} DA</td>
          </tr>
        </tbody>
      </table>

      {tx.note && (
        <div className="mb-8 text-sm">
          <p className="font-semibold mb-1">Note :</p>
          <p className="text-gray-700 italic">{tx.note}</p>
        </div>
      )}

      <p className="text-sm mb-12">
        Je soussigné(e) <strong>{worker.full_name}</strong>{worker.matricule ? ` (matricule ${worker.matricule})` : ""}, reconnais
        {v === "decharge" ? " avoir reçu de la société ERCM SA la somme indiquée ci-dessus en règlement de mes acomptes." : " avoir reçu de la société ERCM SA la somme indiquée ci-dessus à titre d'acompte sur salaire."}
      </p>

      <div className="grid grid-cols-2 gap-12 mt-16 text-sm">
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2">Signature Employeur</div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2">Signature Employé</div>
        </div>
      </div>
    </div>
  );
}
