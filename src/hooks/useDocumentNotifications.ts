import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Subscribes to document status changes and shows a toast when a document
 * in the current user's department (or any, for RH/ADMIN) is validated/rejected.
 */
export function useDocumentNotifications() {
  const { user, role } = useAuth();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("document-status-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "documents" },
        async (payload: any) => {
          const newRow = payload.new;
          const oldRow = payload.old;
          if (!newRow || newRow.status === oldRow?.status) return;
          if (newRow.validated_by === user.id) return; // don't notify the validator

          // Lookup worker for context (RLS will restrict if not allowed)
          const { data: worker } = await supabase
            .from("workers")
            .select("full_name, department")
            .eq("id", newRow.worker_id)
            .maybeSingle();
          if (!worker) return;

          const isPrivileged = role === "ADMIN" || role === "RH";
          if (!isPrivileged && worker.department !== role) return;

          if (newRow.status === "VALIDATED") {
            toast.success(`Document validé — ${worker.full_name}`);
          } else if (newRow.status === "REJECTED") {
            toast.error(`Document rejeté — ${worker.full_name}${newRow.rejection_reason ? `: ${newRow.rejection_reason}` : ""}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role]);
}
