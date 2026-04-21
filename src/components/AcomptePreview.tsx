import logoErcm from "@/assets/logo-ercm.png";
import type { AcompteTransaction, Worker } from "@/lib/supabase-helpers";

interface Props {
  worker: Worker;
  tx: AcompteTransaction;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(n);
const dt = (s: string) => new Date(s).toLocaleDateString("fr-FR");

export default function AcomptePreview({ worker, tx }: Props) {
  return (
    <div className="bg-white text-black mx-auto max-w-[800px] p-12 shadow-lg" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between border-b-2 border-primary pb-4 mb-8">
        <img src={logoErcm} alt="ERCM" className="h-16" />
        <div className="text-right">
          <h2 className="font-bold text-lg">ERCM SA</h2>
          <p className="text-xs text-gray-600">Bon d'Acompte</p>
        </div>
      </div>

      <h1 className="text-center text-2xl font-bold uppercase tracking-wider mb-8">
        Bon d'Acompte N° {tx.id.slice(0, 8).toUpperCase()}
      </h1>

      <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
        <div><span className="font-semibold">Date :</span> {dt(tx.transaction_date)}</div>
        <div><span className="font-semibold">Opération :</span> {tx.type === "add" ? "Avance accordée" : "Remboursement"}</div>
        <div className="col-span-2"><span className="font-semibold">Employé :</span> {worker.full_name}</div>
        {worker.matricule && <div><span className="font-semibold">Matricule :</span> {worker.matricule}</div>}
        {worker.position && <div><span className="font-semibold">Fonction :</span> {worker.position}</div>}
        {worker.department && <div className="col-span-2"><span className="font-semibold">Département :</span> {worker.department}</div>}
      </div>

      <table className="w-full border border-gray-400 mb-8 text-sm">
        <tbody>
          <tr className="border-b border-gray-400">
            <td className="p-3 font-semibold bg-gray-100 w-1/2">Solde précédent</td>
            <td className="p-3 text-right">{fmt(tx.previous_balance)} DA</td>
          </tr>
          <tr className="border-b border-gray-400">
            <td className="p-3 font-semibold bg-gray-100">Montant {tx.type === "add" ? "de l'avance" : "du remboursement"}</td>
            <td className="p-3 text-right font-bold text-primary">{tx.type === "add" ? "+" : "−"} {fmt(tx.amount)} DA</td>
          </tr>
          <tr>
            <td className="p-3 font-semibold bg-gray-100">Nouveau solde</td>
            <td className="p-3 text-right font-bold">{fmt(tx.new_balance)} DA</td>
          </tr>
        </tbody>
      </table>

      {tx.note && (
        <div className="mb-8 text-sm">
          <p className="font-semibold mb-1">Note :</p>
          <p className="text-gray-700 italic">{tx.note}</p>
        </div>
      )}

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
