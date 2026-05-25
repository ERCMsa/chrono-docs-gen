import { ShieldAlert } from "lucide-react";

export default function Forbidden({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
      <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
      <p className="text-muted-foreground max-w-md">
        {message ?? "Vous n'avez pas les permissions nécessaires pour accéder à cette page."}
      </p>
    </div>
  );
}
