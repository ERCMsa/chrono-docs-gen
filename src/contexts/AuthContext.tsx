import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ModuleKey, PermissionAction, UserRole } from "@/lib/permissions";

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
}

export interface Permission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: Profile | null;
  role: UserRole | null;
  permissions: Permission[];
  loading: boolean;
  hasPermission: (module: ModuleKey | string, action: PermissionAction) => boolean;
  isAdmin: () => boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USERNAME_DOMAIN = "ercmsa.internal";
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: perms }] = await Promise.all([
      supabase.from("profiles" as any).select("*").eq("id", uid).maybeSingle(),
      supabase.from("permissions" as any).select("module,can_view,can_create,can_edit,can_delete").eq("user_id", uid),
    ]);
    setUser((prof as any) ?? null);
    setPermissions((perms as any) ?? []);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setUser(null);
        setPermissions([]);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error) return { error: "Identifiants invalides" };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPermissions([]);
  };

  const isAdmin = () => user?.role === "ADMIN" && user?.is_active === true;

  const hasPermission = (module: ModuleKey | string, action: PermissionAction) => {
    if (isAdmin()) return true;
    const p = permissions.find((x) => x.module === module);
    if (!p) return false;
    switch (action) {
      case "view": return p.can_view;
      case "create": return p.can_create;
      case "edit": return p.can_edit;
      case "delete": return p.can_delete;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role: user?.role ?? null,
        permissions,
        loading,
        hasPermission,
        isAdmin,
        signIn,
        signOut,
        refresh: () => (session?.user ? loadProfile(session.user.id) : Promise.resolve()),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
