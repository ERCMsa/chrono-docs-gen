import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ModuleKey, PermissionAction } from "@/lib/permissions";
import Forbidden from "@/pages/Forbidden";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
  module?: ModuleKey;
  action?: PermissionAction;
}

export default function PrivateRoute({ children, requireAdmin, module, action = "view" }: Props) {
  const { session, loading, isAdmin, hasPermission, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Chargement...</div>;
  }
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user && !user.is_active) {
    return <Forbidden message="Votre compte a été désactivé. Contactez un administrateur." />;
  }
  if (requireAdmin && !isAdmin()) return <Forbidden />;
  if (module && !hasPermission(module, action)) return <Forbidden />;
  return <>{children}</>;
}
