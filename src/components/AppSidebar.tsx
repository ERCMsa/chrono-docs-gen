import { Link, useLocation } from "react-router-dom";
import { Users, LayoutDashboard, LogOut, LogIn, AlertTriangle, FilePlus, BarChart3, FileText, X, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoErcm from "@/assets/logo-ercm.png";

const navItems = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/workers", label: "Employés", icon: Users },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/statistics", label: "Statistiques", icon: BarChart3 },
  { to: "/generate/contract", label: "Contrat", icon: FilePlus },
  { to: "/generate/bon_sortie", label: "Bon de sortie", icon: LogOut },
  { to: "/generate/bon_rentree", label: "Bon de rentrée", icon: LogIn },
  { to: "/generate/avertissement", label: "Avertissement", icon: AlertTriangle },
  { to: "/acomptes", label: "Acomptes", icon: Wallet },
];

interface AppSidebarProps {
  onClose?: () => void;
}

export default function AppSidebar({ onClose }: AppSidebarProps) {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoErcm} alt="ERCM" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-lg font-bold text-sidebar-primary tracking-tight">Rh Doc Gen</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestion documentaire</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-sidebar-foreground/70">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
